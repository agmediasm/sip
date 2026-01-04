import { colors, borderRadius } from '@/styles/theme'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'pills' | 'underline'
}

export function Tabs({ tabs, activeTab, onChange, variant = 'pills' }: TabsProps) {
  if (variant === 'underline') {
    return (
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: `1px solid ${colors.border}`,
          overflow: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? colors.champagne : 'transparent'}`,
                color: isActive ? colors.champagne : colors.textSecondary,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  style={{
                    padding: '2px 8px',
                    background: isActive ? colors.champagne : colors.slate,
                    color: isActive ? colors.noir : colors.textSecondary,
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '4px',
        background: colors.charcoal,
        borderRadius: borderRadius.lg,
        overflow: 'auto',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: isActive ? colors.onyx : 'transparent',
              border: 'none',
              borderRadius: borderRadius.md,
              color: isActive ? colors.champagne : colors.textSecondary,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  padding: '2px 8px',
                  background: isActive ? colors.champagne : colors.slate,
                  color: isActive ? colors.noir : colors.textSecondary,
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
