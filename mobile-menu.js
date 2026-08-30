(function(){
  function init(){
    var toggle=document.getElementById('navToggle');
    var links=document.getElementById('navLinks');
    if(!toggle||!links)return;

    toggle.addEventListener('click',function(){
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });

    links.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click',function(){
        toggle.classList.remove('open');
        links.classList.remove('open');
      });
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
