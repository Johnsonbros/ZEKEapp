import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

interface ZekeLocationWidgetProps {
  status?: 'idle' | 'saving' | 'saved';
  lastSaved?: string;
}

export function ZekeLocationWidget({ status = 'idle', lastSaved }: ZekeLocationWidgetProps) {
  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return lastSaved ? `Saved: ${lastSaved}` : 'Location Saved!';
      default:
        return 'Tap to save location';
    }
  };

  const getButtonColor = () => {
    switch (status) {
      case 'saving':
        return '#64748B';
      case 'saved':
        return '#22C55E';
      default:
        return '#6366F1';
    }
  };

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderRadius: 24,
        padding: 16,
      }}
      clickAction="SAVE_LOCATION"
      clickActionData={{ action: 'save_location' }}
    >
      <FlexWidget
        style={{
          width: 56,
          height: 56,
          backgroundColor: getButtonColor(),
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <TextWidget
          text="📍"
          style={{
            fontSize: 24,
          }}
        />
      </FlexWidget>

      <TextWidget
        text="ZEKE"
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#F8FAFC',
          marginBottom: 4,
        }}
      />

      <TextWidget
        text={getStatusText()}
        style={{
          fontSize: 12,
          color: '#94A3B8',
          textAlign: 'center',
        }}
      />
    </FlexWidget>
  );
}
