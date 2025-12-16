// Google Calendar Integration via Replit Connector
import { google, calendar_v3 } from 'googleapis';

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getCalendarClient(): Promise<calendar_v3.Calendar> {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  calendarId: string;
  calendarName: string;
  color: string;
}

export interface CalendarListItem {
  id: string;
  name: string;
  color: string;
  primary: boolean;
}

export async function getCalendarList(): Promise<CalendarListItem[]> {
  try {
    const calendar = await getCalendarClient();
    const response = await calendar.calendarList.list();
    
    const calendars: CalendarListItem[] = (response.data.items || []).map(cal => ({
      id: cal.id || '',
      name: cal.summary || 'Unnamed Calendar',
      color: cal.backgroundColor || '#4285F4',
      primary: cal.primary || false,
    }));
    
    return calendars;
  } catch (error) {
    console.error('[Google Calendar] Error fetching calendar list:', error);
    throw error;
  }
}

export async function getEvents(
  timeMin?: string,
  timeMax?: string,
  calendarId: string = 'primary',
  maxResults: number = 50
): Promise<CalendarEvent[]> {
  try {
    const calendar = await getCalendarClient();
    
    const now = new Date();
    const defaultTimeMin = timeMin || now.toISOString();
    const defaultTimeMax = timeMax || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const response = await calendar.events.list({
      calendarId,
      timeMin: defaultTimeMin,
      timeMax: defaultTimeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const events: CalendarEvent[] = (response.data.items || []).map(event => {
      const startDateTime = event.start?.dateTime || event.start?.date || '';
      const endDateTime = event.end?.dateTime || event.end?.date || '';
      const isAllDay = !event.start?.dateTime;
      
      return {
        id: event.id || '',
        title: event.summary || 'Untitled Event',
        description: event.description || null,
        location: event.location || null,
        startTime: startDateTime,
        endTime: endDateTime,
        allDay: isAllDay,
        calendarId,
        calendarName: 'Primary',
        color: event.colorId ? getEventColor(event.colorId) : '#4285F4',
      };
    });
    
    return events;
  } catch (error) {
    console.error('[Google Calendar] Error fetching events:', error);
    throw error;
  }
}

export async function getEventsFromAllCalendars(
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 100
): Promise<CalendarEvent[]> {
  try {
    const calendars = await getCalendarList();
    const allEvents: CalendarEvent[] = [];
    
    for (const cal of calendars) {
      try {
        const calendar = await getCalendarClient();
        const now = new Date();
        const defaultTimeMin = timeMin || now.toISOString();
        const defaultTimeMax = timeMax || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const response = await calendar.events.list({
          calendarId: cal.id,
          timeMin: defaultTimeMin,
          timeMax: defaultTimeMax,
          maxResults: Math.floor(maxResults / calendars.length),
          singleEvents: true,
          orderBy: 'startTime',
        });
        
        const events = (response.data.items || []).map(event => {
          const startDateTime = event.start?.dateTime || event.start?.date || '';
          const endDateTime = event.end?.dateTime || event.end?.date || '';
          const isAllDay = !event.start?.dateTime;
          
          return {
            id: event.id || '',
            title: event.summary || 'Untitled Event',
            description: event.description || null,
            location: event.location || null,
            startTime: startDateTime,
            endTime: endDateTime,
            allDay: isAllDay,
            calendarId: cal.id,
            calendarName: cal.name,
            color: cal.color,
          };
        });
        
        allEvents.push(...events);
      } catch (err) {
        console.error(`[Google Calendar] Error fetching events from ${cal.name}:`, err);
      }
    }
    
    allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    return allEvents;
  } catch (error) {
    console.error('[Google Calendar] Error fetching events from all calendars:', error);
    throw error;
  }
}

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  return getEventsFromAllCalendars(startOfDay.toISOString(), endOfDay.toISOString());
}

export async function getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return getEventsFromAllCalendars(now.toISOString(), endDate.toISOString());
}

function getEventColor(colorId: string): string {
  const colors: Record<string, string> = {
    '1': '#7986CB',
    '2': '#33B679',
    '3': '#8E24AA',
    '4': '#E67C73',
    '5': '#F6BF26',
    '6': '#F4511E',
    '7': '#039BE5',
    '8': '#616161',
    '9': '#3F51B5',
    '10': '#0B8043',
    '11': '#D50000',
  };
  return colors[colorId] || '#4285F4';
}
