document.getElementById('zip').addEventListener('click', () => {
  chrome.runtime.sendMessage({type:'download', mode:'zip'});
});
document.getElementById('ind').addEventListener('click', () => {
  chrome.runtime.sendMessage({type:'download', mode:'individual'});
});
