/**
 * Given an item (Service or Product document) and the full list of Discount
 * documents, returns the best currently-live discount that applies to it and
 * the resulting price. "Best" = whichever discount saves the customer more.
 *
 * modelName must be "Service" or "Product" - it's how we match scope.
 */
function getEffectivePrice(item, allDiscounts, modelName) {
  const now = new Date();
  const scopeKey = modelName === "Service" ? "services" : "products";

  const applicable = allDiscounts.filter((d) => {
    if (!d.active || d.startDate > now || d.endDate < now) return false;
    if (d.scope === "all") return true;
    if (d.scope === scopeKey) return true;
    if (d.scope === "item" && d.targetModel === modelName && String(d.targetId) === String(item._id)) {
      return true;
    }
    return false;
  });

  if (applicable.length === 0) {
    return { originalPrice: item.price, finalPrice: item.price, discount: null };
  }

  // Pick whichever discount yields the lowest final price
  let best = null;
  let bestFinal = item.price;

  for (const d of applicable) {
    const final =
      d.type === "percentage"
        ? item.price - item.price * (d.value / 100)
        : Math.max(item.price - d.value, 0);

    if (final < bestFinal) {
      bestFinal = final;
      best = d;
    }
  }

  if (!best) {
    return { originalPrice: item.price, finalPrice: item.price, discount: null };
  }

  return {
    originalPrice: item.price,
    finalPrice: Math.round(bestFinal * 100) / 100,
    discount: {
      id: best._id,
      title: best.title,
      type: best.type,
      value: best.value,
      endDate: best.endDate,
    },
  };
}

module.exports = { getEffectivePrice };
