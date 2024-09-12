module.exports = (content) => {
  return `<div style="position: relative">
<span class="ui top right attached blue icon label">
  <i class="expand icon"></i>
</span>\n`
  + '\n<pre class="mermaid attached">\n'
  + content
  + '\n</pre>\n'
  + '</div>';
};
