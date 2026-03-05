import { useTheme } from './ThemeContext'
import { renderIcon, THEME_ICONS } from '../../utils/iconRegistry'

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      style={{ 
        borderRadius: '50%', 
        width: '48px', 
        height: '48px',
        backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
        border: '1px solid ' + (theme === 'dark' ? '#4b5563' : '#d1d5db'),
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        color: theme === 'dark' ? '#fff' : '#000',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#4b5563' : '#d1d5db';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#374151' : '#e5e7eb';
      }}
    >
      {theme === 'dark' ? renderIcon('sun') : renderIcon('moon')}
    </button>
  )
}
