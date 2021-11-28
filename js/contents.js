tf.env().set('WEBGL_CPU_FORWARD', false);

var left = [];
var right = [];

const state = {
    video: null,
    net: null,
    canvas: null,
    btnOnClick: false,
    eyeBoxStatus: null,
    leftEyeAnalysis: null,
    percentTruth: 0
};

async function overrideGetUserMedia() {

    //Create canvas use for replace the Google Meet Video
    var canvas = document.createElement("canvas");
    canvas.setAttribute("id", "sourceCanvas");
    canvas.setAttribute("style", "display:none");
    document.documentElement.appendChild(canvas);
    state.canvas = canvas;

    // Create box to display current detection
    var eyeBox = document.createElement("div");
    eyeBox.setAttribute("id", "eyeBox");
    eyeBox.setAttribute("style", "width: 175px; height: 25px; color: white; position: absolute; z-index: 999; padding: 5px 5px 0px 5px; top: 20px");
    document.body.appendChild(eyeBox);
    state.eyeBox = eyeBox;

    // Create box to display current detection
    var leftEyeAnalysis = document.createElement("div");
    leftEyeAnalysis.setAttribute("id", "leftEyeAnalysis");
    leftEyeAnalysis.setAttribute("style", "width: 200px; height: 25px; color: white; position: absolute; z-index: 999; padding: 5px 5px 0px 5px; top: 40px");
    document.body.appendChild(leftEyeAnalysis);
    state.leftEyeAnalysis = leftEyeAnalysis;

    //Get user video for replace the video in Google Meet
    injectMediaSourceSwap();

    // set up the mutation observer
    var observer = new MutationObserver(function (mutations, me) {
        // `mutations` is an array of mutations that occurred
        // `me` is the MutationObserver instance
        var canvas = document.getElementById("realVideo");
        if (canvas) {
            realVideoAdded(canvas);
            me.disconnect(); // stop observing
            return;
        }
    });

    // start observing
    observer.observe(document, {
        childList: true,
        subtree: true,
    });
}

function realVideoAdded(video) {
    state.video = video;

    video.onloadedmetadata = function () {
        //Set Width and Height
        state.video.width = state.video.videoWidth;
        state.video.height = state.video.videoHeight;
        state.canvas.width = state.video.width;
        state.canvas.height = state.video.height;

        state.video.play();

        faceMeshInRealTime();
    };
}

async function start() {

    overrideGetUserMedia();
    await loadFaceMesh();

}

function injectMediaSourceSwap() {
    // from https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script
    var script = document.createElement("script");
    script.src = browser.runtime.getURL("js/mediaSourceSwap.js");
    script.onload = function () {
        script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}

function wait4Meet2Start(){
    console.log( 'Waiting for the Meet to start' )
    waitForElement( '[data-allocation-index]' ,function(){
        start();
    })
}

// simple function that waits until a specific element exists in the DOM...
// (adapted from Stack Overflow)
function waitForElement(elementPath, callBack){
	//console.log( 'Waiting for: ' + elementPath )
		
	let waitfor=elementPath==='[data-call-ended = "true"]'?10000:2500
		
	window.setTimeout(function(){
		let itExists = document.querySelector(elementPath)

		if( !itExists || itExists.length === 0 ) {

			waitForElement(elementPath, callBack);
		}
		else{
			callBack(elementPath, itExists);
		}
	},waitfor)
}

//Face Mesh Iris Tracking
const irisLandmark = {
    rightEyeUpper0: [246, 161, 160, 159, 158, 157, 173],
    rightEyeLower0: [33, 7, 163, 144, 145, 153, 154, 155, 133],
    rightEyeIris: [473, 474, 475, 476, 477],
  
    leftEyeUpper0: [466, 388, 387, 386, 385, 384, 398],
    leftEyeLower0: [263, 249, 390, 373, 374, 380, 381, 382, 362],
    leftEyeIris: [468, 469, 470, 471, 472],
};

// Track the Face In Real Time
//Look at Left: Truth Teller
// Look at Right: Lying
//https://www.smithsonianmag.com/science-nature/myth-busted-looking-left-or-right-doesnt-indicate-if-youre-lying-1922058/ 
function faceMeshInRealTime() {

    async function faceMeshFrame() {
        var ctx = state.canvas.getContext("2d");
        ctx.drawImage(state.video, 0, 0);
        
        //Detect Face Mesh in Video
        var face = await detectFaceMesh();

        if (face.length > 0) 
        {
            face.forEach((prediction) => {
                const keypoints = prediction.scaledMesh;
            
                state.leftEyeAnalysis.innerHTML = "Truth Teller: 0 %";
                state.eyeBox.innerHTML = "DETECTING...";

                if(Math.abs(keypoints[466][0] - keypoints[468][0]) < 5){
                    state.eyeBox.innerHTML = "LOOKING LEFT";
                    left.push("left");
                }
                else if(Math.abs(keypoints[263][0] - keypoints[468][0]) < 5){
                    state.eyeBox.innerHTML = "LOOKING LEFT";
                    left.push("left");
                }
                else if (Math.abs(keypoints[468][0] - keypoints[398][0]) < 5){
                    state.eyeBox.innerHTML = "LOOKING RIGHT";
                    right.push("right");
                }
                else if (Math.abs(keypoints[468][0] - keypoints[364][0]) < 5){
                    state.eyeBox.innerHTML = "LOOKING RIGHT";
                    right.push("right");
                }

                state.percentTruth = (left.length / (left.length + right.length)) * 100;
                state.leftEyeAnalysis.innerHTML = "Truth Teller: " + state.percentTruth + "%";
                
            });
        }
        else{
            state.eyeBox.innerHTML = "";
            state.leftEyeAnalysis.innerHTML = "";
        }

        //Refresh
        requestAnimationFrame(faceMeshFrame);
    }

    faceMeshFrame();
}

async function loadFaceMesh(){

    state.net = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
    
}

async function detectFaceMesh(){
    return await state.net?.estimateFaces({
        input: state.video
    });
}

wait4Meet2Start();