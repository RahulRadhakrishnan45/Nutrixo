function buildDateRange(filterType, fromStr, toStr) {
  const today = new Date();

  const startOfDay = d => new Date(d.setHours(0,0,0,0));
  const endOfDay   = d => new Date(d.setHours(23,59,59,999));

  let startDate = null;
  let endDate = null;

  if (filterType === 'daily') {
    startDate = startOfDay(new Date(today));
    endDate = endOfDay(new Date(today));
  } 
  else if (filterType === 'weekly') {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    startDate = startOfDay(weekStart);
    endDate = endOfDay(today);
  } 
  else if (filterType === 'monthly') {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    startDate = startOfDay(monthStart);
    endDate = endOfDay(monthEnd);
  } 
  else if (filterType === 'custom') {
    if (!fromStr || !toStr) return { startDate: null, endDate: null };

    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);
    startDate = startOfDay(new Date(fromDate));
    endDate = endOfDay(new Date(toDate));
  }

  return { startDate, endDate };
}


function buildMatch(startDate, endDate) {
  const match = {};

  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }

  return match;
}

module.exports = { buildDateRange, buildMatch };
