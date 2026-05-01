/**
 * Always return light on web — dark theme is not supported on web.
 */
export function useColorScheme(): 'light' {
  return 'light';
}
