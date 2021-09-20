var list;
var expres="";
var lrcTime=[],
    lrcli,
    currentLine,
    currentTime,
    lrc_ppxx,
    songlist,
    screencenter=window.innerHeight/2;
var download_lrc,issl=[];
var audio,now,order_his=[],order_typ;
window.onload=function(){
    now=0;
    download_lrc=1;
    audio=document.getElementById('player');
    audio.addEventListener('ended',function(){
        if(order_typ)rnd();
        else nxt();
    });
    audio.ontimeupdate=function(){
        currentTime=audio.currentTime;
        for(var j=currentLine,len=lrcTime.length;j<len;j++){
            if (currentTime<lrcTime[j+1]&&currentTime>lrcTime[j]){
                currentLine=j;
                lrc_ppxx=screencenter-(currentLine*48);
                lrcul.style.transform="translateY("+lrc_ppxx+"px)";
                try{lrcli[currentLine-1].classList.remove('on')}catch{}
                lrcli[currentLine].classList.add('on');
                break;
            }
        }
    };
    audio.onseeked=function(){
        currentTime=audio.currentTime;
        try{lrcli[currentLine].classList.remove('on');}catch{}
        for(k=0,len=lrcTime.length;k<len;++k){
            if(currentTime<lrcTime[k+1]&&currentTime<lrcTime[k]){
                currentLine=k;
                break;
            }
        }
    };
    audio.onerror=function(){
        mdui.snackbar({message: '播放失败,自动下一首',timeout: 500,position: 'top'});
        nxt();
    };
}

function getlrc(id){
    var xhr=new XMLHttpRequest();
    xhr.open('GET',list[id].lrc,false);
    xhr.send();
    var t=xhr.responseText;
    lrcTime=[];
    lrcul=document.getElementById('lrclist');
    lrcul.innerHTML="";
    lrcul.style.transform="translateY("+screencenter+"px)";
    currentLine=0;
    if(t==''){
        var x=document.createElement("li");
        x.classList.add('mdui-list-item');
        x.innerText="暂无歌词";
        lrcul.appendChild(x);
        return;
    }
    t=t.split('\n');
    for(var i=0;i<t.length;++i){
        lrcTime[i]=parseFloat(t[i].substr(1,3))*60+parseFloat(t[i].substring(4,10));
        var x=document.createElement("li");
        x.classList.add('mdui-list-item');
        x.innerText=t[i].substr(11,t[i].length);
        lrcul.appendChild(x);
    }
	lrcTime[lrcTime.length]=lrcTime[lrcTime.length-1]+3;
    lrcli=document.querySelectorAll('#lrclist li');
}
function play(i){
    songlist[now].children[1].style.fontWeight='normal';
    now=Number(i);
    audio.setAttribute('src',list[i].url);
    getlrc(i);
    songlist[i].scrollIntoView(false);
    songlist[i].children[1].style.fontWeight='bold';
    order_his.push(i);
}
function pre(){
    if(order_his.length>1)
        order_his.pop(),play(order_his.pop());
}
function nxt(){
    if(order_typ)rnd();
    else{
        if(now<list.length-1)play(now+1);
        else play(0);
    }
}
function rnd(){play(Math.floor((Math.random()*(list.length-1))));}
function order_toggle(){
    var x=document.getElementById('order_toggle');
    if(order_typ)x.style.color='';
    else x.style.color='#f7a4b9';
    order_typ^=1;
}

function get(){
    var id=document.getElementById('playlistid').value,
        typ=document.getElementById('playlisttyp').value,
        xhr=new XMLHttpRequest();
    xhr.open('GET',"https://api.i-meto.com/meting/api?server="+typ+"&type=playlist&id="+id,false);
    xhr.send();
    list=JSON.parse(xhr.responseText);
}

function saveas(res,filename){
    var blob=res,a=document.createElement('a');
    a.download=filename;
    a.href=window.URL.createObjectURL(blob);
    a.click();
}
function download_(i){
    while(!issl[i]&&i<list.length)++i;
    if(i>=list.length)return;
    songlist[i].scrollIntoView(false);
    songlist[i].style.background='#ffeaf0';
    
    var name=list[i].author+"-"+list[i].title,
        val=document.getElementById('download_name').value;
    if(val==1)name=list[i].title+"-"+list[i].author;
    else if(val==2)name=list[i].title;

    var tmp=name,r="/\\*?<>|?:";name='';
    for(var j=0;j<tmp.length;++j)
        if(r.indexOf(tmp[j])!=-1)name+='_';
        else name+=tmp[j];
    console.log((i+1)+'/'+list.length);

    var xhr=new XMLHttpRequest();
    xhr.onprogress=function(e){
        if(e.lengthComputable)
            document.getElementById("progressbar_").style.width=Math.round(100*e.loaded/e.total)+'%';
    };
    xhr.responseType="blob";
    xhr.open("GET",list[i].url,true);
    xhr.onreadystatechange=function(e){
        if(this.readyState==4){
            if(this.status==200)
                saveas(this.response,name+'.mp3');
            download_(i+1);
        }
    }
    xhr.send();

    if(!download_lrc)return;

    var xhr=new XMLHttpRequest();
    xhr.responseType="blob";
    xhr.open("GET",list[i].lrc,true);
    xhr.onreadystatechange=function(e){
        if(this.readyState==4){
            if(this.status==200)
                saveas(this.response,name+'.lrc')
        }
    }
    xhr.send();
}
function download(){
    mdui.snackbar({message: '开始下载',timeout: 500,position: 'top'});
    download_(0);
    mdui.snackbar({message: '下载完成',timeout: 500,position: 'top'});
}
function expt_(i,typ){
    var name=list[i].author+"-"+list[i].title,
        val=document.getElementById('download_name').value;
    if(val==1)name=list[i].title+"-"+list[i].author;
    else if(val==2)name=list[i].title;
    
    var tmp=name,r="/\\*?<>|?:";name='';
    for(var j=0;j<tmp.length;++j)
        if(r.indexOf(tmp[j])!=-1)name+='_';
        else name+=tmp[j];

    if(typ=='wget')
        expres+="wget \""+list[i].url+"\" -O \""+name+".mp3\"\n";
    else if(typ=='certutil')
        expres+="certutil -urlcache -split -f \""+list[i].url+"\" \""+name+".mp3\"\n";
    if(!download_lrc)return;
    if(typ=='wget')
        expres+="wget \""+list[i].lrc+"\" -O \""+name+".lrc\"\n";
    else if(typ=='certutil')
        expres+="certutil -urlcache -split -f \""+list[i].lrc+"\" \""+name+".lrc\"\n";
}
function expt(typ){
    mdui.snackbar({message: '加载中',timeout: 500,position: 'top'});
    expres="";
    for(i in list)if(issl[i])expt_(i,typ);
    console.clear(),console.log(expres);
    mdui.snackbar({message: '加载完毕',timeout: 500,position: 'top'});
    mdui.snackbar({
        message:"请按F12打开控制台(Console)复制,并在终端运行",
        timeout:5000,position:'top'
    });
}
function genlist(){
    mdui.snackbar({message: '加载中',timeout: 500,position: 'top'});
    get();
    songlist=document.getElementById('songlist');
    for(i in list){
        var li=document.createElement('li'),
            avatar=document.createElement('div'),
            pic=document.createElement('img'),
            a=document.createElement('a'),
            title=document.createElement('div'),
            author=document.createElement('div'),
            label=document.createElement('label'),
            chkbox=document.createElement('input'),
            chkicon=document.createElement('i');

        li.classList.add('mdui-list-item');
        li.setAttribute('data-id',i);
        avatar.classList.add('mdui-list-item-avatar');
        pic.src=list[i].pic;
        pic.onerror=function(){var t=this.src;this.src='';this.src=t;};
        a.onclick=function(){play(this.parentElement.getAttribute('data-id'));};
        a.classList.add('mdui-list-item-content');
        title.innerText=list[i].title,title.classList.add('mdui-list-item-title');
        author.innerText=list[i].author,author.classList.add('mdui-list-item-text');
        label.classList.add('mdui-checkbox');
        chkbox.onclick=function(){issl[this.parentElement.parentElement.getAttribute('data-id')]^=1;};
        chkbox.setAttribute('type','checkbox');
        chkicon.classList.add('mdui-checkbox-icon');

        avatar.appendChild(pic);
        a.appendChild(title),a.appendChild(author);
        label.appendChild(chkbox),label.appendChild(chkicon);
        li.appendChild(avatar),li.appendChild(a),li.appendChild(label);
        issl[i]=0;

        songlist.appendChild(li);
    }
    songlist=songlist.children;
    mdui.snackbar({message: '加载完毕',timeout: 500,position: 'top'});
}
function selectrev(){
    for(var i=0;i<songlist.length;++i){
        var x=songlist[i].children[2].children[0];
        if(issl[i])x.checked=false;
        else x.checked=1;
        issl[i]^=1;
    }
}