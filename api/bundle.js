var fLeft=document.getElementById("fLeft"),
    fRight=document.getElementById("fRight");
fLeft.style.height=fRight.style.height=window.innerHeight+'px';

var api,list=[],url=[],len=0;
var expres;
var lrcTime=[],
    lrcli,
    currentLine,
    currentTime,
    Songlist=document.getElementById('songlist'),
    songlist=Songlist.children,
    screencenter=window.innerHeight/2;
var download_lrc=1,issl=[];
var audio=document.getElementById('player'),
    now=0,
    range=document.getElementById('song_range'),
    order_his=[],
    order_typ=0,
    repeat=0,
    played=[];
var loading=document.getElementById('loading'),
    login_dialog=new mdui.Dialog('#login_dialog'),
    user_playlist_dialog=new mdui.Dialog('#user_playlist_dialog'),
    daily_recommend_dialog=new mdui.Dialog('#daily_recommend_dialog'),
    drawer=new mdui.Drawer('#drawer'),
    content_right=document.getElementById('content-right'),
    notice=document.getElementById('notice'),noticefade;

if(getCookie('account'))
    document.querySelectorAll('.need-login').forEach(x=>{x.hidden=0;}),
    gen_user_playlist(JSON.parse(getCookie('account'))),
    gen_daily_recommend_list();

drawer.open();

function format_s(num){
    return [num/60,num%60].map(v=>{
        return `${Math.floor(v).toString().padStart(2,'0')}`
    }).join(':');
}

function lrc_focus(x=currentLine){
    content_right.scroll(0,lrcli[x].offsetTop);
    lrcli[x].classList.add('on');
}
function lrc_unfocus(x=currentLine){
    try{lrcli[x].classList.remove('on')}catch{}
}
audio.volume=0.5;
audio.loop=false;
audio.addEventListener('ended',function(){
    if(order_typ)rnd();
    else nxt();
});
audio.ontimeupdate=function(){
    currentTime=audio.currentTime;
    range.value=currentTime*100/this.duration;
    mdui.updateSliders(range.parentElement);
    document.getElementById('song_time').innerText=format_s(currentTime)+'/'+format_s(this.duration);
    for(var j=currentLine,len=lrcTime.length;j<len;++j){
        if (currentTime<lrcTime[j+1]&&currentTime>lrcTime[j]){
            if(currentLine==j)break;
            lrc_unfocus();
            lrc_focus(currentLine=j);
            break;
        }
    }
};
audio.onseeked=function(){
    try{lrcli[currentLine].classList.remove('on');}catch{}
    currentTime=audio.currentTime;
    range.value=currentTime*100/this.duration;
    mdui.updateSliders(range.parentElement);
    document.getElementById('song_time').innerText=format_s(currentTime)+'/'+format_s(this.duration);
    for(var j=0,len=lrcTime.length;j<len;++j){
        if(currentTime<lrcTime[j+1]&&currentTime<lrcTime[j]){
            if(currentLine==j)break;
            lrc_unfocus();
            lrc_focus(currentLine=j);
            break;
        }
    }
};
audio.onerror=function(){
    Notice('播放失败,自动下一首');
    nxt();
};

async function play(i){
    songlist[now].children[1].style.fontWeight='normal';
    now=Number(i);
    if(audio.paused)document.getElementById('song_play_toggle').onclick();
    audio.pause();
    audio.setAttribute('src',await geturl(i));
    audio.play();
    Notice('正在播放 '+list[i].title);
    document.getElementById('song_pic').setAttribute('src',list[i].pic+'?param=40y40');
    document.getElementById('view_more_song_pic').setAttribute('src',list[i].pic);
    document.getElementById('song_title').innerText=document.getElementById('view_more_song_title').innerText=list[i].title;
    document.getElementById('song_author').innerText=document.getElementById('view_more_song_author').innerText=list[i].author;
    document.getElementById('song_link').href="https://music.163.com/#/song?id="+list[i].id;
    songlist[i].scrollIntoView(false);
    songlist[i].children[1].style.fontWeight='bold';
    gen_lrc(i);
    order_his.push(i);
    played[i]=1;
}
function pre(){
    if(order_his.length>1)
        order_his.pop(),play(order_his.pop());
    else Notice('没有上一首了');
}
function nxt(){
    if(order_typ)rnd();
    else{
        if(now<len-1)play(now+1);
        else if(repeat)played=[],play(0);
    }
}
function rnd(){
    var x=Math.floor((Math.random()*(len-1)));
    for(var i=len;i;--i)
        if(played[x])x=Math.floor((Math.random()*(len-1)));
        else{play(x);break;}
    if(repeat)played=[],play(x);
}

document.getElementById('song_play_toggle').onclick=function(){
    if(audio.paused)audio.play(),this.children[0].innerText='pause';
    else audio.pause(),this.children[0].innerText='play_arrow';
}
document.getElementById('song_range').onchange=function(){
    audio.currentTime=audio.duration*this.value/100;
}
document.getElementById('song_volume').onchange=function(){
    audio.volume=this.value;
}

document.onkeydown=function(e){
    var keyCode=e.keyCode||e.which||e.charCode;
    if(e.ctrlKey){
        if(keyCode==37)pre();
        if(keyCode==39)nxt();        
        if(keyCode==80)document.getElementById('song_play_toggle').click();
    }
}

document.getElementById('input_email_passwd').onkeydown=function(e){
    var keyCode=e.keyCode||e.which||e.charCode;
    if(keyCode==13)login_email();
}
document.getElementById('input_phone_passwd').onkeydown=function(e){
    var keyCode=e.keyCode||e.which||e.charCode;
    if(keyCode==13)login_phone();
}

async function ajax(url,set={}){
    try{
        const res=await fetch(url,set);  
        if(res.ok)return res;
    }catch(ex){console.log(ex);}
};

async function get_api(str){
    api=document.getElementById('api').value;
    var x=await ajax(api+str,{credentials:'include',method:'GET'}),
        text=await x.text();
    return JSON.parse(text);
}
async function post_api(str){
    api=document.getElementById('api').value;
    var x=await ajax(api+str,{credentials:'include',method:'POST'}),
        text=await x.text();
    return JSON.parse(text);
}

async function gen_list(){
    loading.hidden=0;
    playlist_clr();

    var id=document.getElementById('playlistid').value,
        res=await get_api('/playlist/detail?id='+id),
        ids=[];
        
    for(i of res.playlist.trackIds)ids.push(i.id);
    playlist_push(ids);
    loading.hidden=1;
}
function playlist_clr(){
    list=[],issl=[],url=[],len=0;
    Songlist.innerHTML='';
}
function Playlist_append(i){
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
    pic.src=list[i].pic+'?param=40y40';
    a.onclick=function(){play(this.parentElement.getAttribute('data-id'));};
    a.classList.add('mdui-list-item-content');
    title.innerText=list[i].title,title.classList.add('mdui-list-item-title');
    author.innerText=list[i].author,author.classList.add('mdui-list-item-text');
    label.classList.add('mdui-checkbox');
    chkbox.onclick=function(){issl[this.parentElement.parentElement.getAttribute('data-id')]^=1;};
    chkbox.setAttribute('type','checkbox');
    chkicon.classList.add('mdui-checkbox-icon');

    avatar.append(pic);
    a.append(title,author);
    label.append(chkbox,chkicon);
    li.append(avatar,a,label);
    issl[i]=0;

    Songlist.append(li);
}
async function playlist_push(arr){
    var res,ids=[],blk=100;
    for(var i=0;i<arr.length;i+=blk){
        var ids=arr.slice(i,i+blk),
            res=await get_api('/song/detail?ids='+ids.join(','));
        for(let x of res.songs){
            var author=[];
            for(let j of x.ar)author.push(j.name);
            list.push({
                'id':ids.shift(),
                'title':x.name,
                'author':author.join('/'),
                'pic':x.al.picUrl
            });
            Playlist_append(len++);
        }
    }
}

function lrcsplit(str){
    str=str.split(']');
    str[0]='';
    return str.join('');
}
function lrc_time(str){
    if(str.substr(0,4)=='[by:'||!str)return 0;
    return parseFloat(str.substr(1,3))*60+parseFloat(str.substring(4,10));
}
async function gen_lrc(i){
    var t=await get_lrc(i),or,tr;
    lrcTime=[];
    lrcul=document.getElementById('lrclist');
    lrcul.innerHTML="";
    lrcul.style.transform="translateY("+screencenter+"px)";
    currentLine=0;
    if(t.nolyric){
        lrcul.innerHTML=`<li class="mdui-list-item"><div class="mdui-list-item-content">暂无歌词</div></li>`;
        return;
    }
    try{
        or=t.lrc.lyric.split('\n');
        tr=t.tlyric.lyric.split('\n');
    }catch{
        console.log('无翻译或无歌词');
        return;
    }
    for(var i=0,j=0;i<or.length;++i){
        lrcTime[i]=lrc_time(or[i]);
        try{while(lrc_time(tr[j])<lrcTime[i]&&j<tr.length)++j;}catch{}
        var x=document.createElement("li"),
            y=document.createElement('div'),
            t1=document.createElement('div'),
            t2=document.createElement('div');
        t1.classList.add('mdui-list-item-title'),
        t2.classList.add('mdui-list-item-text'),
        y.classList.add('mdui-list-item-content'),
        x.classList.add('mdui-list-item');

        x.setAttribute('onclick',"audio.currentTime="+(lrcTime[i]-0.2).toString()+',audio.onseeked');

        try{
            var l1=lrcsplit(or[i])
            t1.innerText=l1;
            if(l1&&lrc_time(tr[j])==lrcTime[i]&&j<tr.length)
                t2.innerText=lrcsplit(tr[j]);
        }catch{}
        y.append(t1,t2);
        x.append(y);
        lrcul.append(x);
    }
    lrcli=document.querySelectorAll('#lrclist li');
}
function order_toggle(){
    var x=document.getElementById('order_toggle');
    if(order_typ)x.style.color='';
    else x.style.color='#f7a4b9';
    order_typ^=1;
}
function repeat_toggle(){
    var x=document.getElementById('repeat_toggle');
    if(repeat)x.style.color='';
    else x.style.color='#f7a4b9';
    repeat^=1;
}
async function geturl(i){
    if(!url[i]){
        var res=await get_api('/song/url?id='+list[i].id);
        url[i]=res.data[0].url;
        try{url[i]=url[i].replace('http','https');}catch{}
    }
    return url[i];
}
async function get_lrc(i){
    var res=await get_api('/lyric?id='+list[i].id);
    return res;
}

function saveas(res,filename){
    var blob=res,a=document.createElement('a');
    a.download=filename;
    a.href=window.URL.createObjectURL(blob);
    a.click();
}
async function download(i){
    var name=list[i].author+"-"+list[i].title,
        val=document.getElementById('download_name').value;
    if(val==1)name=list[i].title+"-"+list[i].author;
    else if(val==2)name=list[i].title;

    var tmp=name,r="/\\*?<>|?:";name='';
    for(let j of tmp)
        if(r.indexOf(j)!=-1)name+='_';
        else name+=j;

    Notice('正在下载'+name);

    await fetch(await geturl(i)).
        then(res=>res.blob().then(blob=>saveas(blob,name+'.mp3')));

    if(!download_lrc)return;
    var blob=new Blob([await get_lrc(i)],{type:"text/plain;charset=utf-8"});
    saveas(blob,name+'.lrc');
}
async function downloadall(){
    for(i in list)if(issl[i]){
        console.log(i);
        try{await download(i);}catch{}
    }
}

function selectrev(){
    for(var i=0;i<len;++i){
        var x=songlist[i].children[2].children[0];
        if(issl[i])x.checked=false;
        else x.checked=1;
        issl[i]^=1;
    }
}

/*----------------------------------*/

async function login_email(){
    var email=document.getElementById('input_email').value,
        passwd=document.getElementById('input_email_passwd').value;
    loading.hidden=0;
    var res=await post_api('/login?email='+encodeURI(email)+'&password='+encodeURI(passwd));
    if(res.code=='200'){
        Notice('登录成功');
        var user={
            "id":res.account.id,
            "name":res.profile.nickname,
            "avatar":res.profile.avatarUrl,
            "signature":res.profile.signature,
        }
        setCookie('account',JSON.stringify(user));
        gen_user_playlist(user);
        gen_daily_recommend_list();
        login_dialog.close();
        document.querySelectorAll('.need-login').forEach(x=>{x.hidden=0;});
    }
    else{
        passwd.value='',
        Notice('错误,请检查用户名或密码');
    }
    loading.hidden=1;
}

async function login_phone(){
    var phone=document.getElementById('input_phone').value,
        passwd=document.getElementById('input_phone_passwd').value;
    loading.hidden=0;
    var res=await post_api('/login/cellphone?phone='+encodeURI(phone)+'&password='+encodeURI(passwd));
    if(res.code=='200'){
        Notice('登录成功');
        var user={
            "id":res.account.id,
            "name":res.profile.nickname,
            "avatar":res.profile.avatarUrl,
            "signature":res.profile.signature,
        }
        setCookie('account',JSON.stringify(user));
        gen_user_playlist(user);
        gen_daily_recommend_list();
        login_dialog.close();
        document.querySelectorAll('.need-login').forEach(x=>{x.hidden=0;});
    }
    else{
        passwd.value='',
        Notice('错误,请检查用户名或密码');
    }
    loading.hidden=1;
}

async function logout(){
    var res=await post_api('/login/refresh');
    setCookie('account',false);
    if(res.code=='200')
        Notice('已退出登录'),
        document.querySelectorAll('.need-login').forEach(x=>{x.hidden=1;});

}
async function gen_user_playlist(json){
    document.getElementById('user_name').innerText=json.name;
    document.getElementById('user_avatar').src=json.avatar;
    document.getElementById('user_signature').innerText=json.signature;
    var res=await get_api('/user/playlist?uid='+json.id),
        user_playlist=document.getElementById('user_playlist');
    user_playlist.innerHTML="";
    res=res.playlist;
    for(i in res){
        var x=document.createElement('li'),
            cover=document.createElement('div'),
            coverimg=document.createElement('img'),
            name=document.createElement('div');
        x.classList.add('mdui-list-item');
        cover.classList.add('mdui-list-item-avatar'),
        name.classList.add('mdui-list-item-content');

        coverimg.src=res[i].coverImgUrl;
        name.innerText=res[i].name;

        cover.append(coverimg);
        x.append(cover,name);

        x.setAttribute('id',res[i].id);
        x.onclick=function(){
            document.getElementById('playlistid').value=this.id;
            gen_list();
            user_playlist_dialog.close();
        }

        user_playlist.append(x);
    }
    user_playlist_dialog.handleUpdate();
}

async function gen_daily_recommend_list(){
    var daily_recommend=document.getElementById('daily_recommend');
    daily_recommend.innerHTML="";

    var x=document.createElement('li'),
        cover=document.createElement('i'),
        title=document.createElement('div'),
        name=document.createElement('div'),
        copywriter=document.createElement('div');
    x.classList.add('mdui-list-item');
    cover.classList.add('mdui-list-item-avatar','mdui-icon','material-icons'),
    title.classList.add('mdui-list-item-content'),
    name.classList.add('mdui-list-item-title'),
    copywriter.classList.add('mdui-list-item-text');

    cover.innerHTML='today';
    name.innerText='每日歌曲推荐';
    copywriter.innerText='根据你的口味生成,每天6:00更新';
    title.append(name,copywriter);
    x.append(cover,title);
    x.onclick=function(){
        gen_daily_recommend_song();
        daily_recommend_dialog.close();
    }
    daily_recommend.append(x);

    var res=await get_api('/recommend/resource');
    for(i of res.recommend){
        var x=document.createElement('li'),
            cover=document.createElement('div'),
            coverimg=document.createElement('img'),
            title=document.createElement('div'),
            name=document.createElement('div'),
            copywriter=document.createElement('div');
        x.classList.add('mdui-list-item');
        cover.classList.add('mdui-list-item-avatar'),
        title.classList.add('mdui-list-item-content'),
        name.classList.add('mdui-list-item-title'),
        copywriter.classList.add('mdui-list-item-text');

        coverimg.src=i.picUrl;
        name.innerText=i.name;
        copywriter.innerText=i.copywriter;

        cover.append(coverimg);
        title.append(name,copywriter);
        x.append(cover,title);

        x.setAttribute('id',i.id);
        x.onclick=function(){
            document.getElementById('playlistid').value=this.id;
            gen_list();
            daily_recommend_dialog.close();
        }
        daily_recommend.append(x);
    }
    daily_recommend_dialog.handleUpdate();
}

async function gen_daily_recommend_song(){
    loading.hidden=0;
    playlist_clr();
    var res=await get_api('/recommend/songs'),ids=[];
    for(let i of res.data.dailySongs)ids.push(i.id);
    playlist_push(ids);
    loading.hidden=1;
}

async function like(i){
    loading.hidden=0;
    try{
        var res=await post_api('/like?id='+list[i].id.toString());
        if(res.code==200)
            Notice("喜欢了 "+list[i].title);
        else console.log("喜欢 "+list[i].title)+"时出错了";
    }catch{console.log("喜欢 "+list[i].title)+"时出错了";}
    loading.hidden=1;
}
async function like_select(){
    for(i in list)if(issl[i])await like(i);
}

async function daily_signin(){
    loading.hidden=0;
    try{
        var res=await post_api('/daily_signin');
        if(res.code==200)Notice('签到成功');
        else if(res.code==-2)Notice('重复签到');
    }
    catch{Notice('签到时出错');}
    loading.hidden=1;
}
function sleep(time){return new Promise((resolve)=>setTimeout(resolve,time));}
function Notice(str,timeout=1000){
    notice.innerText=str;
    notice.style.opacity=1;
    noticefade=0;
    function fade(){
        if(noticefade)if((notice.style.opacity-=0.01)>0)
        requestAnimationFrame(fade);
    }
    sleep(timeout).then(()=>{
        noticefade=1;
        fade();
    });
}
function getCookie(cname){
    var name=cname+"=",decodedCookie=decodeURIComponent(document.cookie),ca=decodedCookie.split(';'),c;
    for(i in ca){
        c=ca[i];
        while(c.charAt(0)==' ')c=c.substring(1);
        if(c.indexOf(name)==0)return c.substring(name.length,c.length);
    }return false;
}
function setCookie(cname,cval,exdays=1){
    if(getCookie(cname)==cval)return;
    var d=new Date();
    d.setTime(d.getTime()+(exdays*24*60*60*1000));
    var expires="expires="+d.toUTCString();
    document.cookie=cname+"="+cval+";"+expires+";path=/";
}