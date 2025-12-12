// ============================================
// Inject Script - Runs in page context
// For accessing page-level JavaScript
// ============================================

// This script is injected into the page context to access
// variables and functions that aren't available in content scripts

(function() {
  'use strict';

  // Expose messaging interface
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data.type !== 'AGENTIC_PAGE_REQUEST') return;

    const { action, payload, requestId } = event.data;
    let result: any = null;
    let error: string | null = null;

    try {
      switch (action) {
        case 'GET_REACT_STATE':
          result = getReactState();
          break;

        case 'GET_VUE_STATE':
          result = getVueState();
          break;

        case 'GET_ANGULAR_STATE':
          result = getAngularState();
          break;

        case 'EXECUTE_PAGE_FUNCTION':
          result = executePageFunction(payload.path, payload.args);
          break;

        case 'GET_LOCAL_STORAGE':
          result = Object.fromEntries(
            Object.entries(localStorage).filter(([k]) =>
              !k.includes('password') && !k.includes('token') && !k.includes('secret')
            )
          );
          break;

        case 'GET_SESSION_STORAGE':
          result = Object.fromEntries(
            Object.entries(sessionStorage).filter(([k]) =>
              !k.includes('password') && !k.includes('token') && !k.includes('secret')
            )
          );
          break;

        case 'GET_COOKIES':
          result = document.cookie.split(';').map(c => c.trim());
          break;

        default:
          error = `Unknown action: ${action}`;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    }

    window.postMessage({
      type: 'AGENTIC_PAGE_RESPONSE',
      requestId,
      result,
      error
    }, '*');
  });

  // Get React component state (React DevTools-like)
  function getReactState(): any {
    const reactRoot = document.getElementById('root') || document.getElementById('app');
    if (!reactRoot) return null;

    // Try to find React fiber
    const key = Object.keys(reactRoot).find(k => k.startsWith('__reactFiber'));
    if (!key) return null;

    const fiber = (reactRoot as any)[key];
    if (!fiber) return null;

    // Extract state (limited to avoid circular refs)
    function extractState(node: any, depth = 0): any {
      if (depth > 3 || !node) return null;

      const result: any = {};

      if (node.memoizedState) {
        result.state = node.memoizedState;
      }

      if (node.memoizedProps) {
        result.props = Object.keys(node.memoizedProps);
      }

      if (node.child) {
        result.child = extractState(node.child, depth + 1);
      }

      return result;
    }

    return extractState(fiber);
  }

  // Get Vue component state
  function getVueState(): any {
    const vueApp = (window as any).__VUE__;
    if (!vueApp) return null;

    // Try Vue 3
    const vue3Root = document.getElementById('app');
    if (vue3Root && (vue3Root as any).__vue_app__) {
      const app = (vue3Root as any).__vue_app__;
      return {
        version: 3,
        config: app.config,
        components: Object.keys(app._context.components || {})
      };
    }

    // Try Vue 2
    if ((window as any).Vue) {
      return {
        version: 2,
        data: 'Vue 2 detected'
      };
    }

    return null;
  }

  // Get Angular state
  function getAngularState(): any {
    const ngApp = (window as any).ng;
    if (!ngApp) return null;

    const appRoot = document.querySelector('[ng-version]');
    if (appRoot) {
      return {
        version: appRoot.getAttribute('ng-version'),
        detected: true
      };
    }

    return null;
  }

  // Execute a function from page context
  function executePageFunction(path: string, args: any[]): any {
    const parts = path.split('.');
    let current: any = window;

    for (const part of parts) {
      if (current[part] === undefined) {
        throw new Error(`Path ${path} not found`);
      }
      current = current[part];
    }

    if (typeof current !== 'function') {
      throw new Error(`${path} is not a function`);
    }

    return current.apply(null, args || []);
  }

  // Signal that inject script is loaded
  window.postMessage({
    type: 'AGENTIC_INJECT_READY'
  }, '*');
})();
