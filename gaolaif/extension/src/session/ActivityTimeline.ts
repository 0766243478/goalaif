import type {
  TimelineEvent,
  SessionId,
} from './types';

// Activity Timeline class - persistent timeline of all session activities
export class ActivityTimeline {
  private timelineEvents: Map<SessionId, TimelineEvent[]> = new Map();
  private readonly maxEvents = 1000;

  // Add event to session timeline
  addEvent(sessionId: SessionId, event: Omit<TimelineEvent, 'id' | 'timestamp'>): string {
    let events = this.timelineEvents.get(sessionId) || [];
    
    const timelineEvent: TimelineEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...event,
    };
    
    events.push(timelineEvent);
    
    if (events.length > this.maxEvents) {
      events = events.slice(events.length - this.maxEvents);
    }
    
    this.timelineEvents.set(sessionId, events);
    
    return timelineEvent.id;
  }

  // Get all events for a session
  getEvents(sessionId: SessionId): TimelineEvent[] {
    return this.timelineEvents.get(sessionId) || [];
  }

  // Get last N events for a session
  getLastEvents(sessionId: SessionId, count: number): TimelineEvent[] {
    const events = this.getEvents(sessionId);
    return events.slice(-count);
  }

  // Get events by type filter
  getEventsByType(sessionId: SessionId, type: string): TimelineEvent[] {
    const events = this.getEvents(sessionId);
    return events.filter(e => e.type === type);
  }

  // Get events within time range
  getEventsInRange(sessionId: SessionId, start: number, end: number): TimelineEvent[] {
    const events = this.getEvents(sessionId);
    return events.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  // Clear all events for a session
  clearSession(sessionId: SessionId): void {
    this.timelineEvents.delete(sessionId);
  }

  // Clear all events across all sessions
  clearAll(): void {
    this.timelineEvents.clear();
  }
}
