import { useState, useSyncExternalStore } from 'react'
import {
    subscribeDiagnostics,
    getDiagnosticsSnapshot,
} from './rendererDiagnosticsStore'

/**
 * RendererDiagnosticsOverlay — Sprint 6.6D-1.
 *
 * Dev-only (gated on import.meta.env.DEV — no-ops entirely in a
 * production build). Purely reads rendererDiagnosticsStore; renders
 * nothing that affects gameplay or layout beyond a small fixed-position
 * panel, and is pointer-events-none except its own collapse toggle.
 */
function RendererDiagnosticsOverlay() {
    const snapshot = useSyncExternalStore(subscribeDiagnostics, getDiagnosticsSnapshot)
    // Starts collapsed — a small button, not a panel — so it never covers
    // the app on load. Expanding is an explicit click, same toggle as before.
    const [collapsed, setCollapsed] = useState(true)

    if (!import.meta.env.DEV) return null

    const errors = snapshot.validation.filter((issue) => issue.severity === 'error')
    const warnings = snapshot.validation.filter((issue) => issue.severity === 'warning')

    const viewModel = snapshot.capability?.viewModel
    const viewModelLine = viewModel?.detected
        ? `${viewModel.properties.join(', ') || '(no properties reported)'}`
        : 'not detected — asset appears to use classic State Machine only'

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 8,
                left: 8,
                zIndex: 9999,
                maxWidth: collapsed ? 'auto' : 380,
                maxHeight: collapsed ? 'auto' : 'min(70vh, 480px)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                fontSize: 11,
                lineHeight: 1.4,
                color: '#e8e8e8',
                background: 'rgba(20, 20, 24, 0.88)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                boxShadow: collapsed ? 'none' : '0 4px 16px rgba(0,0,0,0.35)',
                padding: collapsed ? '6px 10px' : '8px 10px',
                pointerEvents: 'auto',
            }}
        >
            <button
                onClick={() => setCollapsed((c) => !c)}
                style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontWeight: 700,
                    flexShrink: 0,
                    color: errors.length > 0 ? '#ff6b6b' : warnings.length > 0 ? '#ffd166' : '#8fe388',
                }}
                aria-expanded={!collapsed}
                title={collapsed ? 'Show Mochi renderer diagnostics' : 'Hide Mochi renderer diagnostics'}
            >
                {collapsed ? '🐟' : 'Mochi Renderer Diagnostics ▾'}
                {(errors.length > 0 || warnings.length > 0) &&
                    ` (${errors.length} err / ${warnings.length} warn)`}
            </button>

            {!collapsed && (
                <div style={{ marginTop: 6, overflowY: 'auto' }}>
                    <Row label="Semantic state" value={snapshot.semanticState ?? '(none yet)'} />
                    <Row label="Active renderer" value={snapshot.activeRendererPath} />
                    <Row
                        label="Render path (tier)"
                        value={
                            snapshot.renderPath
                                ? `${snapshot.renderPath.tier} — ${snapshot.renderPath.reason}`
                                : '(none yet)'
                        }
                    />
                    <Row label="Active ViewModel property" value={viewModelLine} />
                    <Row
                        label="Active input (state machine)"
                        value={
                            snapshot.activeInput
                                ? `${snapshot.activeInput.name} = ${snapshot.activeInput.value}`
                                : '(none yet)'
                        }
                    />
                    <Row
                        label="Active timeline(s)"
                        value={snapshot.activeTimelines.length ? snapshot.activeTimelines.join(', ') : '(none)'}
                    />

                    {errors.length > 0 && (
                        <IssueList title="Missing capabilities" issues={errors} color="#ff6b6b" />
                    )}
                    {warnings.length > 0 && (
                        <IssueList title="Validation warnings" issues={warnings} color="#ffd166" />
                    )}
                </div>
            )}
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ marginBottom: 3 }}>
            <span style={{ opacity: 0.6 }}>{label}: </span>
            <span>{value}</span>
        </div>
    )
}

function IssueList({
    title,
    issues,
    color,
}: {
    title: string
    issues: Array<{ category: string; message: string }>
    color: string
}) {
    return (
        <div style={{ marginTop: 6 }}>
            <div style={{ color, fontWeight: 700 }}>{title}</div>
            <ul style={{ margin: '2px 0 0', paddingLeft: 16 }}>
                {issues.map((issue, i) => (
                    <li key={i} style={{ marginBottom: 2 }}>
                        <span style={{ opacity: 0.6 }}>[{issue.category}]</span> {issue.message}
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default RendererDiagnosticsOverlay
