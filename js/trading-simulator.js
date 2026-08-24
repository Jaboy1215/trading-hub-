export function createPaperPortfolio(startingCash = 10000) {
  return {
    startingCash,
    cash: startingCash,
    position: null,
    trades: []
  };
}

export function executeSignal(portfolio, signal, candle) {
  if (portfolio.position || signal.score < 7) {
    return { portfolio, event: null };
  }

  const allocation = portfolio.cash * 0.15;
  const quantity = allocation / candle.close;
  const trade = {
    side: "BUY",
    price: candle.close,
    quantity,
    value: allocation,
    reason: signal.title
  };

  return {
    portfolio: {
      ...portfolio,
      cash: portfolio.cash - allocation,
      position: { entry: candle.close, quantity },
      trades: [...portfolio.trades, trade]
    },
    event: trade
  };
}

export function portfolioSnapshot(portfolio, price) {
  const positionValue = portfolio.position ? portfolio.position.quantity * price : 0;
  const equity = portfolio.cash + positionValue;
  const unrealizedPnl = portfolio.position ? positionValue - portfolio.position.quantity * portfolio.position.entry : 0;

  return { equity, positionValue, unrealizedPnl, openPosition: Boolean(portfolio.position) };
}
