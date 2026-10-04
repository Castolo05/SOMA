const fs = require('fs');
const file = 'client/src/pages/psychologist/PatientDetail.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const handleLayoutChange = \(currentLayout, allLayouts\) => \{[\s\S]*?localStorage\.setItem\(lsLayout\(id\), JSON\.stringify\(merged\)\)\n\s*return merged\n\s*\}\)/,
  `const handleLayoutChange = (currentLayout, allLayouts) => {
    const sourceLayout = allLayouts.lg || currentLayout;
    
    setLayout(prev => {
      const merged = prev.map(item => {
        const upd = sourceLayout.find(n => n.i === item.i)
        return upd ? { ...item, ...upd } : item
      })
      if (JSON.stringify(prev) === JSON.stringify(merged)) {
        return prev;
      }
      localStorage.setItem(lsLayout(id), JSON.stringify(merged))
      return merged
    })
  }`
);

content = content.replace(
  /const observer = new ResizeObserver\(entries => \{[\s\S]*?\}\)/,
  `const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const newWidth = entry.contentRect.width;
        setContainerWidth(prev => Math.abs(prev - newWidth) > 5 ? newWidth : prev);
      }
    })`
);

fs.writeFileSync(file, content);
