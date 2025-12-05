import React from "react";
import { Card, Typography, Statistic, Row, Col, Timeline } from "antd";
import {
  GlobalOutlined,
  SearchOutlined,
  MailOutlined,
  EyeOutlined,
  FormOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;

interface ActivityEvent {
  id: string;
  timestamp: number;
  type: 'page_visit' | 'search' | 'email_check' | 'distraction' | 'signup' | 'verification' | 'idle';
  url?: string;
  title?: string;
  duration?: number;
}

interface ActivityStats {
  totalEvents: number;
  pageVisits: number;
  searches: number;
  emailChecks: number;
  distractions: number;
  signups: number;
  verifications: number;
  totalActiveTime: number;
  sessionStart: number;
}

interface TimelineSegment {
  time: string;
  count: number;
  types: Record<string, number>;
}

interface AnalyticsTimelineProps {
  activities: ActivityEvent[];
  stats: ActivityStats;
  timeline: TimelineSegment[];
  darkMode: boolean;
}

const activityIcons: Record<string, React.ReactNode> = {
  page_visit: <GlobalOutlined style={{ color: '#1890ff' }} />,
  search: <SearchOutlined style={{ color: '#52c41a' }} />,
  email_check: <MailOutlined style={{ color: '#faad14' }} />,
  distraction: <EyeOutlined style={{ color: '#f5222d' }} />,
  signup: <FormOutlined style={{ color: '#722ed1' }} />,
  verification: <CheckCircleOutlined style={{ color: '#13c2c2' }} />,
  idle: <ClockCircleOutlined style={{ color: '#8c8c8c' }} />,
};

const activityColors: Record<string, string> = {
  page_visit: '#1890ff',
  search: '#52c41a',
  email_check: '#faad14',
  distraction: '#f5222d',
  signup: '#722ed1',
  verification: '#13c2c2',
  idle: '#8c8c8c',
};

export const AnalyticsTimeline: React.FC<AnalyticsTimelineProps> = ({
  activities,
  stats,
  timeline,
  darkMode,
}) => {
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getActivityLabel = (type: string): string => {
    const labels: Record<string, string> = {
      page_visit: 'Page Visit',
      search: 'Search',
      email_check: 'Email Check',
      distraction: 'Distraction',
      signup: 'Signup',
      verification: 'Verification',
      idle: 'Idle',
    };
    return labels[type] || type;
  };

  const recentActivities = activities.slice(-10).reverse();

  return (
    <div style={{ width: '100%' }}>
      <Card
        title="Session Statistics"
        style={{ marginBottom: 16, backgroundColor: darkMode ? '#2a2a2a' : '#ffffff' }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Total Events"
              value={stats.totalEvents}
              valueStyle={{ color: darkMode ? '#ffffff' : '#000000' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Active Time"
              value={formatDuration(stats.totalActiveTime)}
              valueStyle={{ color: darkMode ? '#ffffff' : '#000000' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Page Visits"
              value={stats.pageVisits}
              valueStyle={{ color: darkMode ? '#ffffff' : '#000000' }}
            />
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={6}>
            <Statistic
              title="Searches"
              value={stats.searches}
              prefix={<SearchOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 16 }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Emails"
              value={stats.emailChecks}
              prefix={<MailOutlined />}
              valueStyle={{ color: '#faad14', fontSize: 16 }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Signups"
              value={stats.signups}
              prefix={<FormOutlined />}
              valueStyle={{ color: '#722ed1', fontSize: 16 }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Verifications"
              value={stats.verifications}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#13c2c2', fontSize: 16 }}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title="Activity Timeline"
        style={{ marginBottom: 16, backgroundColor: darkMode ? '#2a2a2a' : '#ffffff' }}
      >
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {timeline.length > 0 ? (
            <div>
              {timeline.map((segment, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 8,
                    padding: 8,
                    backgroundColor: darkMode ? '#1a1a1a' : '#f5f5f5',
                    borderRadius: 4,
                  }}
                >
                  <Text
                    strong
                    style={{
                      width: 60,
                      color: darkMode ? '#ffffff' : '#000000',
                      fontSize: 12,
                    }}
                  >
                    {segment.time}
                  </Text>
                  <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center' }}>
                    {Object.entries(segment.types).map(([type, count]) => (
                      <div
                        key={type}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 6px',
                          backgroundColor: activityColors[type] + '20',
                          borderRadius: 3,
                          border: `1px solid ${activityColors[type]}`,
                        }}
                      >
                        {activityIcons[type]}
                        <Text style={{ fontSize: 11, color: activityColors[type] }}>
                          {count}
                        </Text>
                      </div>
                    ))}
                    {segment.count === 0 && (
                      <Text style={{ fontSize: 11, color: '#8c8c8c' }}>No activity</Text>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Text style={{ color: darkMode ? '#888' : '#666' }}>
              No activity data yet. Start the simulation to see timeline.
            </Text>
          )}
        </div>
      </Card>

      <Card
        title="Recent Activity"
        style={{ backgroundColor: darkMode ? '#2a2a2a' : '#ffffff' }}
      >
        {recentActivities.length > 0 ? (
          <Timeline
            items={recentActivities.map((activity) => ({
              dot: activityIcons[activity.type],
              children: (
                <div>
                  <Text strong style={{ color: darkMode ? '#ffffff' : '#000000' }}>
                    {getActivityLabel(activity.type)}
                  </Text>
                  <br />
                  <Text style={{ fontSize: 12, color: darkMode ? '#888' : '#666' }}>
                    {formatTime(activity.timestamp)}
                    {activity.url && ` - ${new URL(activity.url).hostname}`}
                    {activity.duration && activity.duration > 0
                      ? ` (${formatDuration(activity.duration)})`
                      : ''}
                  </Text>
                </div>
              ),
            }))}
          />
        ) : (
          <Text style={{ color: darkMode ? '#888' : '#666' }}>
            No recent activities. Start the simulation to track behavior.
          </Text>
        )}
      </Card>
    </div>
  );
};
