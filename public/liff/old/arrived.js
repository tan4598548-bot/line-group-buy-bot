let allItems = [];

async function load() {
  await liff.init({ liffId: '你的 LIFF_ID' });

  const res = await fetch('/api/arrived/list');
  allItems = await res.json();

  const products = [...new Set(allItems.map(i => i.productName))];
  const select = document.getElementById('productFilter');
  select.innerHTML = '<option value="">全部</option>' +
    products.map(p => `<option>${p}</option>`).join('');

  render();
}

function render() {
  const q = document.getElementById('search').value;
  const f = document.getElementById('productFilter').value;

  const list = allItems.filter(i =>
    (!q || `${i.productName}${i.color}${i.size}`.includes(q)) &&
    (!f || i.productName === f)
  );

  document.getElementById('list').innerHTML = list.map(i => `
    <label>
      <input type="checkbox" data='${JSON.stringify(i)}'>
      ${i.productName} ${i.color || ''} ${i.size || ''}（${i.quantity}）
    </label><br>
  `).join('');
}

async function submit() {
  const items = [...document.querySelectorAll('input:checked')]
    .map(i => JSON.parse(i.dataset.data));

  await fetch('/api/arrived/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });

  alert('到貨完成');
  liff.closeWindow();
}

document.getElementById('search').oninput = render;
document.getElementById('productFilter').onchange = render;

load();
