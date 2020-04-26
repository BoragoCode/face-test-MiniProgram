const faceapi = require('./face-api.js');
const fetchWechat = require('fetch-wechat');
const inputSize = 288;
const scoreThreshold = 0.45;
const useTinyModel = true;
//模型地址 （models下的模型及权重文件）
const modelUrl = 'http://192.168.1.105:8080/';
var canvas1;
var options;
var canvasId;
var isReserveDraw;
var canvasWidth,canvasHeight

async function loadmodel(_canvasId, _isReserveDraw) {
  canvasId = _canvasId;
  isReserveDraw = _isReserveDraw;
  faceapi.setEnv(createBrowserEnv(canvasId, isReserveDraw));
  canvas1 = {
    width: 128,
    height: 128,
  };
  options = getFaceDetectorOptions();
  await faceapi.loadTinyFaceDetectorModel(modelUrl);
  await faceapi.loadFaceLandmarkTinyModel(modelUrl);
}
async function detect(frame,isWithFaceLandmarks,_canvasWidth,_canvasHeight,point) {
  canvasWidth = _canvasWidth;
  canvasHeight = _canvasHeight;
  const tempTensor = faceapi.tf.tensor(new Uint8Array(frame.data), [frame.height, frame.width, 4]);
  const inputImgElTensor = tempTensor.slice([0, 0, 0], [-1, -1, 3]);
  var detectResults = [];
  if (isWithFaceLandmarks) {
    detectResults = await faceapi.detectAllFaces(inputImgElTensor, options).withFaceLandmarks(useTinyModel);
  } else {
    detectResults = await faceapi.detectAllFaces(inputImgElTensor, options);
  }
  if(point){
    faceapi.tf.dispose(tempTensor);
    faceapi.tf.dispose(inputImgElTensor);
    faceapi.matchDimensions(canvas1, frame);
    const resizedResults = faceapi.resizeResults(detectResults, frame);
    if (isWithFaceLandmarks) {
      const DrawParameter = {
        drawPoints: true,
        drawLines: true
      }
      faceapi.draw.drawFaceLandmarks(canvas1, resizedResults, DrawParameter);
    }
  }
  return detectResults;
}

async function warmup() {
  var frame = faceapi.tf.zeros([1, 1, 1, 3]);
  await faceapi.detectAllFaces(frame, options).withFaceLandmarks(useTinyModel);
  faceapi.tf.dispose(frame);
}

function createBrowserEnv() {
  return {
    Canvas: wx.createOffscreenCanvas(),
    CanvasRenderingContext2D: wx.createCanvasContext(canvasId),
    isReserveDraw: isReserveDraw,
    Image: null,
    ImageData: null,
    Video: null,
    createCanvasElement: function () {
      return {};
    },
    createImageElement: function () {
      return {};
    },
    fetch: fetchWechat.fetchFunc(),
    readFile: function () { }
  };
}
function getFaceDetectorOptions() {
  return new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold
  })
}

module.exports = { loadmodel, warmup, detect };
