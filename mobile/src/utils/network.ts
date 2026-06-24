export const isOnline = async () => {
  try {
    await fetch('https://example.com', { method: 'HEAD' });
    return true;
  } catch {
    return false;
  }
};
