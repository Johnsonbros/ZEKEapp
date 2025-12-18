import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { ZekeLocationWidget } from './ZekeLocationWidget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const WIDGET_DATA_KEY = 'zeke_widget_data';

interface WidgetData {
  status: 'idle' | 'saving' | 'saved';
  lastSaved?: string;
}

async function getWidgetData(): Promise<WidgetData> {
  try {
    const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Widget] Failed to get widget data:', error);
  }
  return { status: 'idle' };
}

async function setWidgetData(data: WidgetData): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[Widget] Failed to set widget data:', error);
  }
}

async function saveLocationToZeke(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('[Widget] Location permission not granted');
      return false;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = location.coords;
    
    const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    const address = reverseGeocode[0];
    const locationName = address 
      ? `${address.street || address.name || 'Unknown'}, ${address.city || address.region || ''}`
      : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

    const apiUrl = process.env.EXPO_PUBLIC_DOMAIN 
      ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
      : 'https://zekeai.replit.app';

    const response = await fetch(`${apiUrl}/api/widget/save-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        locationName,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error('[Widget] Failed to save location to ZEKE:', response.status);
      return false;
    }

    await setWidgetData({
      status: 'saved',
      lastSaved: locationName.slice(0, 30),
    });

    setTimeout(async () => {
      await setWidgetData({ status: 'idle' });
    }, 5000);

    return true;
  } catch (error) {
    console.error('[Widget] Error saving location:', error);
    return false;
  }
}

const nameToWidget: Record<string, React.FC<any>> = {
  ZekeLocation: ZekeLocationWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget = nameToWidget[widgetInfo.widgetName];

  if (!Widget) {
    console.error('[Widget] Unknown widget:', widgetInfo.widgetName);
    return;
  }

  const widgetData = await getWidgetData();

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<Widget {...widgetData} />);
      break;

    case 'WIDGET_CLICK':
      if (props.clickAction === 'SAVE_LOCATION') {
        await setWidgetData({ status: 'saving' });
        props.renderWidget(<Widget status="saving" />);

        const success = await saveLocationToZeke();
        
        const newData = await getWidgetData();
        props.renderWidget(<Widget {...newData} />);
      }
      break;

    default:
      break;
  }
}
