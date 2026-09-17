/**
 * Environment system — public API.
 *
 * Everything outside src/features/environment must import from HERE
 * and only here. If a symbol isn't exported below, it's an
 * implementation detail and free to change.
 */
export { EnvironmentProvider } from './react/EnvironmentProvider'
export { useEnvironment } from './react/useEnvironment'
export { useMochiEnvironmentBridge } from './react/useMochiEnvironmentBridge'
export { useWeatherSync } from './react/useWeatherSync'
export type {
    TimeOfDay,
    WeatherCondition,
    MochiActivityLevel,
    EnvironmentLighting,
    EnvironmentSnapshot,
    EnvironmentActions,
} from './types'
