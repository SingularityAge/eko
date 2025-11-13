import Log from "../common/log";
import Context from "./context";
import { sleep } from "../common/utils";
import { RetryLanguageModel } from "../llm";
import { parseWorkflow } from "../common/xml";
import { LLMRequest } from "../types/llm.types";
import { StreamCallback, Workflow } from "../types/core.types";
import { getPlanSystemPrompt, getPlanUserPrompt } from "../prompt/plan";
import {
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
  LanguageModelV2TextPart,
} from "@ai-sdk/provider";
import { tuneLLMSettings } from "./director";

export class Planner {
  private taskId: string;
  private context: Context;
  private callback?: StreamCallback;

  constructor(context: Context, callback?: StreamCallback) {
    this.context = context;
    this.taskId = context.taskId;
    this.callback = callback || context.config.callback;
  }

  async plan(
    taskPrompt: string | LanguageModelV2TextPart,
    saveHistory: boolean = true
  ): Promise<Workflow> {
    let taskPromptStr;
    let userPrompt: LanguageModelV2TextPart;
    if (typeof taskPrompt === "string") {
      taskPromptStr = taskPrompt;
      userPrompt = {
        type: "text",
        text: getPlanUserPrompt(
          taskPrompt,
          this.context.variables.get("task_website"),
          this.context.variables.get("plan_ext_prompt")
        ),
      };
    } else {
      userPrompt = taskPrompt;
      taskPromptStr = taskPrompt.text || "";
    }
    const messages: LanguageModelV2Prompt = [
      {
        role: "system",
        content: await getPlanSystemPrompt(this.context),
      },
      {
        role: "user",
        content: [userPrompt],
      },
    ];
    return await this.doPlan(taskPromptStr, messages, saveHistory);
  }

  async replan(
    taskPrompt: string,
    saveHistory: boolean = true
  ): Promise<Workflow> {
    const chain = this.context.chain;
    if (chain.planRequest && chain.planResult) {
      const messages: LanguageModelV2Prompt = [
        ...chain.planRequest.messages,
        {
          role: "assistant",
          content: [{ type: "text", text: chain.planResult }],
        },
        {
          role: "user",
          content: [{ type: "text", text: taskPrompt }],
        },
      ];
      return await this.doPlan(taskPrompt, messages, saveHistory);
    } else {
      return this.plan(taskPrompt, saveHistory);
    }
  }

  async doPlan(
    taskPrompt: string,
    messages: LanguageModelV2Prompt,
    saveHistory: boolean,
    retryNum: number = 0
  ): Promise<Workflow> {
    const config = this.context.config;
    const rlm = new RetryLanguageModel(config.llms, config.planLlms);
    rlm.setContext(this.context);
    const baseRequest: LLMRequest = {
      maxTokens: 8192,
      temperature: 0.7,
      messages: messages,
      abortSignal: this.context.controller.signal,
    };
    const request = tuneLLMSettings("planner", baseRequest, this.context.directorState);
    if (
      Log.isEnableInfo() &&
      (baseRequest.temperature !== request.temperature ||
        baseRequest.topP !== request.topP ||
        baseRequest.maxTokens !== request.maxTokens)
    ) {
      Log.info("Director tuned planner request", {
        e: this.context.directorState.e.toFixed(2),
        g: this.context.directorState.g.toFixed(2),
        temperature: request.temperature,
        topP: request.topP,
        maxTokens: request.maxTokens,
      });
    }
    let result;
    try {
      result = await rlm.callStream(request);
    } catch (error: any) {
      const loopSignal = this.context.recordDirectorStep("planner", false);
      this.context.updateDirector({
        lastOutcomeSuccess: false,
        timeoutOccurred:
          typeof error?.message === "string" &&
          error.message.toLowerCase().includes("timeout"),
        loopSignal,
        hardError: true,
      });
      throw error;
    }
    const reader = result.stream.getReader();
    let streamText = "";
    let thinkingText = "";
    try {
      while (true) {
        await this.context.checkAborted(true);
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        let chunk = value as LanguageModelV2StreamPart;
        if (chunk.type == "error") {
          Log.error("Plan, LLM Error: ", chunk);
          throw new Error("LLM Error: " + chunk.error);
        }
        if (chunk.type == "reasoning-delta") {
          thinkingText += chunk.delta || "";
        }
        if (chunk.type == "text-delta") {
          streamText += chunk.delta || "";
        }
        if (chunk.type == "finish") {
          if (chunk.finishReason == "content-filter") {
            throw new Error("LLM error: trigger content filtering violation");
          }
          if (chunk.finishReason == "other") {
            throw new Error("LLM error: terminated due to other reasons");
          }
        }
        if (this.callback) {
          let workflow = parseWorkflow(
            this.taskId,
            streamText,
            false,
            thinkingText
          );
          if (workflow) {
            await this.callback.onMessage({
              taskId: this.taskId,
              agentName: "Planer",
              type: "workflow",
              streamDone: false,
              workflow: workflow as Workflow,
            });
          }
        }
      }
    } catch (e: any) {
      const loopSignal = this.context.recordDirectorStep("planner", false);
      this.context.updateDirector({
        lastOutcomeSuccess: false,
        timeoutOccurred:
          typeof e?.message === "string" &&
          e.message.toLowerCase().includes("timeout"),
        loopSignal,
        hardError: true,
      });
      if (retryNum < 3) {
        await sleep(1000);
        return await this.doPlan(taskPrompt, messages, saveHistory, ++retryNum);
      }
      throw e;
    } finally {
      reader.releaseLock();
      if (Log.isEnableInfo()) {
        Log.info("Planner result: \n" + streamText);
      }
    }
    if (saveHistory) {
      const chain = this.context.chain;
      chain.planRequest = request;
      chain.planResult = streamText;
    }
    let workflow = parseWorkflow(
      this.taskId,
      streamText,
      true,
      thinkingText
    ) as Workflow;
    if (this.callback) {
      await this.callback.onMessage({
        taskId: this.taskId,
        agentName: "Planer",
        type: "workflow",
        streamDone: true,
        workflow: workflow,
      });
    }
    if (workflow.taskPrompt) {
      workflow.taskPrompt += "\n" + taskPrompt;
    } else {
      workflow.taskPrompt = taskPrompt;
    }
    workflow.taskPrompt = workflow.taskPrompt.trim();
    const loopSignal = this.context.recordDirectorStep("planner", true);
    this.context.updateDirector({
      lastOutcomeSuccess: true,
      timeoutOccurred: false,
      loopSignal,
    });
    return workflow;
  }
}
