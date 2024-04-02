# document

// 下面是发送事件的函数,

// 三方编码:
// AppsFlyer: AF
// Facebook: FB
// Google: GO
// Kwai: KW
// TikTok: TT


// 事件名称:
export const AFEventNames = {
  AFEventLogin: "af_login"
};

export const FBEventNames = {
  FBEventLogin: "fb_login"
}

export const GOEventNames = {
  GOEventLogin: "go_login"
}

export const KWEventNames = {
  KWEventLogin: "kw_login"
}

export const TTEventNames = {
  TTEventLogin: "tt_login"
}


// 登录事件函数:
export const sendLoginEvent = async () => {
  try{
    const eventParams = {
      type: "AF", // 三方编码
      events: "login", // 事件名称
      params: {} // 事件参数(可选)
    }
    // 发送事件
    const result = await sendEvent(eventParams);
    return result;
  }catch(e){
    console.error(e);
  }
}

// AF事件,单独处理,因为AF事件需要调用安卓原生方法
export const sendMessageToNative = () => {
  var nativeMessage = {
    action: 'ACTION_MONITOR', // 事件名称(固定)
    params:{
      name: 'AF',
      eventName: 'af_login',
      eventValue:{} // 事件参数(可选)
    }
  };
  // 调用安卓原生方法
  try{
    window.androidJsBridge.monitore(JSON.stringify(nativeMessage));
  } catch(e){
    console.error(e);
  }
}


三方编码：
AppsFlyer: AF
Facebook: FB
Google: GO
Kwai: KW
TikTok: TT

事件编码：
首次打开app：firstOpenApp
登出：logout
登录：login
点击注册：registerClick
注册成功：register
点击充值：rechargeClick
首充成功：firstrecharge
复充成功：recharge
提现点击：withdrawClick
提现成功：withdrawOrderSuccess
进入游戏(包含三方与自营)：enterGame
领取vip奖励：vipReward
领取每日奖励：dailyReward

上报参数：
params: {}
