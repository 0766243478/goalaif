import { useEffect, useCallback, useState, useRef } from 'react';
import { useStore } from '../sidebar/webview/store';
import { SessionManager } from './SessionManager';
import type { ChatMessage, ExploitRecord, ViewId, TimelineEvent } from './types';
import { ActivityTimeline } from './ActivityTimeline';

// Session hook - manages session state and isolation
export function useSession() {
  const { dispatch } = useStore();
  const sessionManagerRef = useRef<SessionManager | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activityTimeline] = useState(() => new ActivityTimeline());

  // Initialize session manager once
  useEffect(() => {
    sessionManagerRef.current = new SessionManager((session) => {
      if (session.id) {
        setCurrentSessionId(session.id);
        dispatch({ type: 'SET_SESSION', id: session.id, name: session.name });
      }
    });
    return () => {
      sessionManagerRef.current = null;
    };
  }, []);

  // Get current session state
  const currentSession = useCallback(() => {
    return sessionManagerRef.current?.getCurrent() || null;
  }, []);

  // Session creation
  const createSession = useCallback(async (request: {
    name: string;
    project: string;
    workspace?: string;
  }) => {
    if (!sessionManagerRef.current) return null;
    const session = await sessionManagerRef.current.create({
      name: request.name,
      project: request.project,
      workspace: request.workspace,
    });
    return session;
  }, []);

  // Load session by ID
  const loadSession = useCallback((sessionId: string) => {
    if (!sessionManagerRef.current) return null;
    const session = sessionManagerRef.current.load(sessionId);
    if (session) {
      setCurrentSessionId(session.id);
    }
    return session;
  }, []);

  // Close session
  const closeSession = useCallback((sessionId: string) => {
    if (!sessionManagerRef.current) return;
    sessionManagerRef.current.close(sessionId);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!sessionManagerRef.current) return false;
    return sessionManagerRef.current.delete(sessionId);
  }, []);

  // Pause session
  const pauseSession = useCallback((sessionId: string) => {
    if (!sessionManagerRef.current) return;
    sessionManagerRef.current.pause(sessionId);
  }, []);

  // Resume session
  const resumeSession = useCallback((sessionId: string) => {
    if (!sessionManagerRef.current) return;
    sessionManagerRef.current.resume(sessionId);
    setCurrentSessionId(sessionId);
  }, []);

  // Set current session
  const setCurrentSession = useCallback((sessionId: string) => {
    if (!sessionManagerRef.current) return;
    sessionManagerRef.current.load(sessionId);
  }, []);

  // Add timeline event
  const addTimelineEvent = useCallback((event: Omit<TimelineEvent, 'id' | 'timestamp'>) => {
    if (!sessionManagerRef.current) return '';
    return activityTimeline.addEvent(currentSessionId || '', event);
  }, [currentSessionId, activityTimeline]);

  // Add chat message
  const addChatMessage = useCallback((message: ChatMessage) => {
    if (!sessionManagerRef.current) return '';
    return sessionManagerRef.current.addChatMessage(currentSessionId || '', message);
  }, [currentSessionId]);

  // Add finding
  const addFinding = useCallback((finding: any) => {
    if (!sessionManagerRef.current) return '';
    return sessionManagerRef.current.addFinding(currentSessionId || '', finding);
  }, [currentSessionId]);

  // Add exploit
  const addExploit = useCallback((exploit: ExploitRecord) => {
    if (!sessionManagerRef.current) return '';
    return sessionManagerRef.current.addExploit(currentSessionId || '', exploit);
  }, [currentSessionId]);

  // Set audit phase
  const setAuditPhase = useCallback((phase: any, message: string) => {
    if (!sessionManagerRef.current) return;
    sessionManagerRef.current.setAuditPhase(currentSessionId || '', phase, message);
  }, [currentSessionId]);

  // Update audit progress
  const updateAuditProgress = useCallback((progress: any) => {
    if (!sessionManagerRef.current) return;
    sessionManagerRef.current.updateAuditProgress(currentSessionId || '', progress);
  }, [currentSessionId]);

  // Get session list
  const listSessions = useCallback(() => {
    if (!sessionManagerRef.current) return [];
    return sessionManagerRef.current.list();
  }, []);

  // Reject cross-session events
  const rejectCrossSessionEvent = useCallback((event: any) => {
    if (!sessionManagerRef.current) return false;
    return sessionManagerRef.current.rejectCrossSessionEvent(event);
  }, []);

  return {
    currentSessionId,
    currentSession,
    createSession,
    loadSession,
    closeSession,
    deleteSession,
    pauseSession,
    resumeSession,
    setCurrentSession,
    addTimelineEvent,
    addChatMessage,
    addFinding,
    addExploit,
    setAuditPhase,
    updateAuditProgress,
    listSessions,
    rejectCrossSessionEvent,
    activityTimeline,
  };
}
