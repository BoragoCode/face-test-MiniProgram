const fetchWechat = require('fetch-wechat');
const plugin = requirePlugin('tfjsPlugin');
const faceapi = require('../../utils/face-api.js');
const face = require('../../utils/face-use.js')
const canvasId = 'canvas1'
const isReserveDraw = true
const isWithFaceLandmarks = true
let FailNum = 0
Page({
  data: {
    activeId:1,
    GlassesProp:[
      {
        id:2,
        src:'images/glasses1.png'
      },
      {
        id:3,
        src:'images/glasses2.png'
      },
      {
        id:4,
        src:'images/glasses3.png'
      }
    ],
    bool:false
  },
  async onLoad () {
    wx.showLoading({
      title: '正在加载...',
    });
    plugin.configPlugin({
      fetchFunc: fetchWechat.fetchFunc(),
      tf: faceapi.tf,
      canvas: wx.createOffscreenCanvas()
    },false);

    await face.loadmodel(canvasId, isReserveDraw);
    await face.warmup();
    wx.hideLoading();
  },
  async onReady(){
    const context = wx.createCameraContext(this)
    let count = 0;
    this.ctx = wx.createCanvasContext(canvasId);
    const listener = context.onCameraFrame((frame) => {
      count++
      if(count==10){
        if(this.data.bool){
          this.predict(frame.data,frame.width,frame.height)
        }
        count = 0
      }
    })
    listener.start()
  },
  btnControl(){
    if(this.ctx){
      setTimeout(()=>{
        this.ctx.draw()
      },500)
    }
    if(!this.data.bool){
      wx.showLoading({
        title: '正在启动...',
      });
    }
    this.setData({
      bool:!this.data.bool
    })
  },
  async predict(imgArray,imageWidth,imageHeight){
      var _this = this
      var arr_buffer ={
        data:imgArray,
        height:imageHeight,
        width:imageWidth
      }
      var detectResults
      detectResults = await face.detect(arr_buffer, isWithFaceLandmarks, imageWidth, imageHeight,(_this.data.activeId==1));
      wx.hideLoading()
      if (!detectResults || detectResults.length === 0) {
        //'暂未检测到人脸'
        FailNum++
        if(FailNum>50){
          _this.btnControl()
          FailNum = 0
          wx.showToast({
            icon:'none',
            duration:3000,
            title: '长时间未检测到人脸，请对准人脸重新尝试'
          })
        }
        return
      }else{
        if(_this.data.activeId!=1){
          FailNum = 0
          // 计算墨镜角度及位置大小等
          var point_1 = detectResults[0].landmarks.positions[0]
          var point_2 = detectResults[0].landmarks.positions[16]
          var g_width = _this.GetDistance(point_1.x,point_1.y,point_2.x,point_2.y)
          var g_height = g_width*41/100
          var FaceDeg = _this.GetTanDeg((point_2.y-point_1.y)/(point_2.x-point_1.x))
          _this.ctx.translate(detectResults[0].landmarks.positions[0].x,detectResults[0].landmarks.positions[0].y)
          _this.ctx.rotate(FaceDeg*Math.PI/180);
          _this.ctx.translate(-detectResults[0].landmarks.positions[0].x,-detectResults[0].landmarks.positions[0].y)
          _this.ctx.drawImage(_this.data.GlassesProp[_this.data.activeId-2].src,point_1.x+(Math.tan(FaceDeg*Math.PI/180)*g_height/2),point_1.y-(g_height*3/4),g_width,g_height)
          _this.ctx.draw()
        }
      }
  },

  PropChose(e){
    const _this = this
    let _id = e.currentTarget.dataset.id
    if(_id == _this.data.activeId){
      return;
    }
    if(_id==1){
      _this.setData({activeId:1})
    }else{
      for(let i=0;i<_this.data.GlassesProp.length;i++){
        if(_id==_this.data.GlassesProp[i].id){
          _this.setData({activeId:_this.data.GlassesProp[i].id})
        }
      }
    }
  },
  GetDistance(lat1,  lng1,  lat2,  lng2){
    //根据两点坐标求斜边长度
    let _h = (lat2-lat1)*(lat2-lat1)+(lng2-lng1)*(lng2-lng1)
    let hypotenuse = Math.ceil(Math.sqrt(_h))
    return hypotenuse;
  },
  GetTanDeg(tan) {
    var result = Math.atan(tan) / (Math.PI / 180);
    result = Math.round(result);
    return result;
  },
  error(e){
    console.log(e)
  }

})
