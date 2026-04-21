module.exports = async function (data) {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  const target = d.toISOString().split("T")[0];

  let isSendNotification = false;

  const endDateStr = data.read_data?.[0]?.image_badge_end_date;

  if (endDateStr) {
    const endDate = new Date(endDateStr).getTime();
    const targetDate = new Date(target).getTime();

    if (endDate <= targetDate) {
      isSendNotification = true;
    }

    return {
      target_date: target,
      isSendNotification,
      endDate,
      targetDate,
      read_data: data.read_data,
      endDateStr,
    };
  }

  return {
    target_date: target,
    isSendNotification,
    read_data: data.read_data,
    endDateStr,
  };
};
