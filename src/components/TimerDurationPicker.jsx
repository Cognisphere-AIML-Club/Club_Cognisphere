import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { ThemeProvider, createTheme } from '@mui/material/styles';

/**
 * MUI TimePicker for Timer Duration Selection in JudgeTimer
 * Replaces standard fixed presets with a rich custom MUI time selector.
 * Adapts seamlessly to Light & Dark themes with compact, responsive sizing.
 */
export default function TimerDurationPicker({
  durationSeconds,
  onChangeDuration,
  disabled = false,
}) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const muiTheme = useMemo(() => {
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: {
          main: '#3b82f6',
        },
        background: {
          paper: isDark ? '#1e293b' : '#ffffff',
          default: isDark ? '#0f172a' : '#f8fafc',
        },
        text: {
          primary: isDark ? '#f8fafc' : '#0f172a',
          secondary: isDark ? '#94a3b8' : '#64748b',
        },
      },
      shape: {
        borderRadius: 12,
      },
    });
  }, [isDark]);

  // Convert duration in seconds to a dayjs time instance
  const valueDayjs = useMemo(() => {
    const total = durationSeconds && durationSeconds > 0 ? durationSeconds : 60;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return dayjs('2026-01-01T00:00:00')
      .hour(hours)
      .minute(minutes)
      .second(seconds);
  }, [durationSeconds]);

  return (
    <ThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="inline-flex items-center">
          <TimePicker
            label="Set Timer (HH:mm:ss)"
            value={valueDayjs}
            disabled={disabled}
            ampm={false}
            views={['hours', 'minutes', 'seconds']}
            format="HH:mm:ss"
            onChange={(newVal) => {
              if (newVal && newVal.isValid()) {
                const totalSec =
                  newVal.hour() * 3600 + newVal.minute() * 60 + newVal.second();
                if (totalSec > 0 && totalSec !== durationSeconds) {
                  onChangeDuration(totalSec);
                }
              }
            }}
            slotProps={{
              textField: {
                size: 'small',
                disabled,
                sx: {
                  width: { xs: '150px', sm: '170px' },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(0, 0, 0, 0.02)',
                    '& fieldset': {
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.12)',
                    },
                    '&:hover fieldset': {
                      borderColor: '#3b82f6',
                    },
                    '&.Mui-disabled': {
                      opacity: 0.45,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.75rem',
                    '&.Mui-disabled': {
                      opacity: 0.5,
                    },
                  },
                  '& .MuiInputBase-input': {
                    py: '6px',
                    px: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.1rem',
                  },
                },
              },
            }}
          />
        </div>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

