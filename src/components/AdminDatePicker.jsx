import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ThemeProvider, createTheme } from '@mui/material/styles';

/**
 * MUI DatePicker for Admin Activity Editors
 * Uses exact MUI x-date-pickers components with Dayjs adapter
 * Automatically adapts to light/dark theme with clean responsive sizing.
 */
export default function AdminDatePicker({
  value,
  onChange,
  label = "Event Date"
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

  const dateDayjs = value ? dayjs(value) : null;

  return (
    <ThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label={label}
          value={dateDayjs}
          onChange={(newVal) => {
            if (newVal && newVal.isValid()) {
              onChange(newVal.format('YYYY-MM-DD'));
            }
          }}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
              sx: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: '0.75rem',
                  fontSize: '0.8125rem',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.8125rem',
                },
                '& .MuiInputBase-input': {
                  py: '8.5px',
                },
              },
            },
          }}
        />
      </LocalizationProvider>
    </ThemeProvider>
  );
}

