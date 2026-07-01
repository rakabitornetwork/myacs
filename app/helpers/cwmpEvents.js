export function isConnectionRequestEvent(events = []) {
  return events.some((event) => {
    const code = String(event).toUpperCase().trim();
    return (
      code.includes('CONNECTION REQUEST') ||
      code === '6 CONNECTION REQUEST' ||
      code.startsWith('6 ') ||
      code === 'M CONNECTIONREQUEST'
    );
  });
}

export function isBootEvent(events = []) {
  return events.some((event) => {
    const code = String(event).toUpperCase();
    return code.includes('BOOTSTRAP') || code.includes('BOOT');
  });
}
