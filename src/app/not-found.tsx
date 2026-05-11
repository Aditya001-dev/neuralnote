export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      color: '#e8e8f0',
      fontFamily: 'system-ui',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <h1 style={{ fontSize: '48px', margin: 0 }}>404</h1>
      <p style={{ color: '#6666aa' }}>Page not found</p>
      <a href="/" style={{ color: '#00e5a0' }}>Go home</a>
    </div>
  );
}