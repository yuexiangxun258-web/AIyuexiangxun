'use client';

import { useEffect, useState } from 'react';
import { TIMELINE_ORDER_KEY, TimelineOrder, timelineAdminCatalog } from '../timeline-order';

export default function TimelineAdmin() {
  const [order, setOrder] = useState<TimelineOrder>(timelineAdminCatalog);
  const [dragged, setDragged] = useState<{ year: string; item: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TIMELINE_ORDER_KEY);
    if (stored) setOrder({ ...timelineAdminCatalog, ...JSON.parse(stored) });
  }, []);

  const persist = (next: TimelineOrder) => {
    setOrder(next);
    localStorage.setItem(TIMELINE_ORDER_KEY, JSON.stringify(next));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  const move = (year: string, from: number, to: number) => {
    if (from === to) return;
    const items = [...order[year]];
    const [item] = items.splice(from, 1);
    items.splice(to, 0, item);
    persist({ ...order, [year]: items });
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><p>LOCAL TIMELINE MANAGER</p><h1>时间线顺序管理</h1></div>
        <a href="/#timeline">返回作品页 →</a>
      </header>
      <p className="admin-help">拖动卡片即可调整同一年份内的展示顺序，修改会自动保存在这台电脑的浏览器中。</p>
      <div className="admin-years">
        {Object.entries(order).map(([year, items]) => (
          <section className="admin-year" key={year}>
            <div className="admin-year-title"><h2>{year}</h2><span>{items.length} 项</span></div>
            <div className="admin-list">
              {items.map((item, index) => (
                <article
                  className="admin-card"
                  draggable
                  key={item}
                  onDragStart={() => setDragged({ year, item })}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!dragged || dragged.year !== year) return;
                    move(year, order[year].indexOf(dragged.item), index);
                    setDragged(null);
                  }}
                >
                  <span className="admin-drag">⠿</span><b>{String(index + 1).padStart(2, '0')}</b><p>{item}</p>
                  <div className="admin-move-buttons">
                    <button type="button" disabled={index === 0} onClick={() => move(year, index, index - 1)}>↑</button>
                    <button type="button" disabled={index === items.length - 1} onClick={() => move(year, index, index + 1)}>↓</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="admin-footer">
        <button type="button" onClick={() => persist(timelineAdminCatalog)}>恢复默认顺序</button>
        <span>{saved ? '已自动保存' : '拖动后自动保存'}</span>
      </div>
    </main>
  );
}
