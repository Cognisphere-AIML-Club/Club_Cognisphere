import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { ThemeProvider, createTheme } from '@mui/material/styles';

/**
 * MUI TimePicker for Admin Activity Editors
 * Uses exact MUI x-date-pickers components with Dayjs adapter and DemoContainer
 * Automatically adapts to light/dark theme with clean responsive sizing.
 */
export default function AdminTimePicker({
  startTime,
  endTime,
  onChangeStart,
  onChangeEnd
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
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);

  const muiTheme = React.useMemo(() => {
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

  // Convert 24h string 'HH:mm' to dayjs object
  const startDayjs = startTime ? dayjs(`2026-11-24T${startTime}`) : null;
  const endDayjs = endTime ? dayjs(`2026-11-24T${endTime}`) : null;

  return (
    <ThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DemoContainer
          components={['TimePicker']}
          sx={{ overflow: 'visible', pt: '2px !important' }}
        >
          <div className="grid grid-cols-2 gap-2 w-full">
            <TimePicker
              label="Start Time"
              value={startDayjs}
              onChange={(newVal) => {
                if (newVal && newVal.isValid()) {
                  onChangeStart(newVal.format('HH:mm'));
                }
              }}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  sx: {
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.75rem',
                    },
                    '& .MuiInputBase-input': {
                      py: '7px',
                    },
                  },
                },
              }}
            />

            <TimePicker
              label="End Time"
              value={endDayjs}
              onChange={(newVal) => {
                if (newVal && newVal.isValid()) {
                  onChangeEnd(newVal.format('HH:mm'));
                }
              }}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  sx: {
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.75rem',
                    },
                    '& .MuiInputBase-input': {
                      py: '7px',
                    },
                  },
                },
              }}
            />
          </div>
        </DemoContainer>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
