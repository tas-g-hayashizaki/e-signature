(function () {

    var Draw = {

        height: 0,
        width: 0,

        canvas: null,
        context: null,
        undobtn: null,
        clearbtn: null,
        locationbtn: null,

        drawing: false,
        startX: 0,
        startY: 0,
        startP: 0,
        offset: 5, // 見えやすいようにちょっとずらす
        undohist: [],

        initialize: function () {

            // 初期化処理 ----------------------------------------------------------------------------

            this.canvas = document.getElementById("myCanvas");
            this.context = this.canvas.getContext("2d");
            this.sizebar = document.getElementById("pensize");
            this.sizebar.value = 10;
            this.undobtn = document.getElementById("btn_undo");
            this.clearbtn = document.getElementById("btn_clear");
            this.locationbtn = document.getElementById("btn_location");
            this.height = this.canvas.height;
            this.width = this.canvas.width;

            this.context.globalCompositeOperation = "source-over"; // 重なった部分は新規イメージ
            this.context.globalAlpha = 1.0;                        // 透明化なし
            this.context.strokeStyle = "#000000";                  // 線の色
            this.context.lineWidth = 0;                            // 線の幅
            this.context.shadowColor = "#000000";                  // 影の色
            this.context.shadowOffsetX = 0;                        // 影の水平距離
            this.context.shadowOffsetY = 0;                        // 影の垂直距離
            this.context.shadowBlur = 0;                           // ぼかし効果
            this.context.lineCap = "round";                        // 線の終端のスタイル
            document.getElementById("lab_pensize").innerHTML = this.sizebar.value;

            // イベント定義 --------------------------------------------------------------------------

            // ペンのサイズ変更
            this.sizebar.addEventListener("change", function (event) {
                document.getElementById("lab_pensize").innerHTML = event.target.value;
            }, false);

            // 画像出力
            document.getElementById("btn_image").addEventListener("click", function (event) {
                document.getElementById("previewer").src = Draw.canvas.toDataURL("image/jpg");
            }, false);

            // 一つ戻る
            this.undobtn.addEventListener("click", function (event) {
                var obj = Draw.undohist.pop(); //一つ前の状態取得
                //未操作の場合、取得した一つ前の状態が現在の状態と同じ場合
                if (Draw.context.getImageData(0, 0, Draw.width, Draw.height).data == obj.data) {
                    //もう一つ前の状態取得
                    obj = Draw.undohist.pop();
                }
                if (obj) {
                    Draw.context.putImageData(obj, 0, 0);
                }
            }, false);

            // クリア
            this.clearbtn.addEventListener("click", function (event) {
                Draw.context.clearRect(0, 0, Draw.width, Draw.height);
            }, false);

            // 位置情報取得
            this.locationbtn.addEventListener("click", function (event) {
                Draw.getLocation();
            }, false);

            // 端末・ブラウザ毎のイベント切り替え
            var touchstart = 'touchstart';
            var touchmove = 'touchmove';
            var touchend = 'touchend';
            if (window.PointerEvent) {
                touchstart = "pointerdown";
                touchmove = "pointermove";
                touchend = "pointerup";
            } else if (window.navigator.msPointerEnabled) { // for Windows8 + IE10
                touchstart = 'MSPointerDown';
                touchmove = 'MSPointerMove';
                touchend = 'MSPointerUp';
            } else if (document.ontouchstart === undefined) { // for other PC browsers
                touchstart = 'mousedown';
                touchmove = 'mousemove';
                touchend = 'mouseup';
            }

            // 描画処理開始イベント
            this.canvas.addEventListener(touchstart, function (event) {
                Draw.touchStart(event); // start drawing.
            }, false);

            // 描画処理中イベント
            this.canvas.addEventListener(touchmove, function (event) {
                Draw.touchMove(event); // continue drawing while dragging the pointer.
                event.preventDefault();
            }, { passive: false });

            // 描画処理終了イベント
            this.canvas.addEventListener(touchend, function (event) {
                Draw.touchEnd(event); // finish drawing.
            }, false);

        },

        getLocation: function () {
            // 現在地を取得
            navigator.geolocation.getCurrentPosition(
                // 取得成功した場合
                function (position) {
                    var geo_text = "緯度:" + position.coords.latitude + "<br>";
                    geo_text += "経度:" + position.coords.longitude + "<br>";
                    geo_text += "高度:" + position.coords.altitude + "<br>";
                    geo_text += "位置精度:" + position.coords.accuracy + "<br>";
                    geo_text += "高度精度:" + position.coords.altitudeAccuracy + "<br>";
                    geo_text += "移動方向:" + position.coords.heading + "<br>";
                    geo_text += "速度:" + position.coords.speed + "<br>";
                    var date = new Date(position.timestamp);
                    geo_text += "取得時刻:" + date.toLocaleString();
                    document.getElementById("log2").innerHTML = geo_text;
                },
                // 取得失敗した場合
                function (error) {
                    switch (error.code) {
                        case 1: //PERMISSION_DENIED
                            alert("位置情報の利用が許可されていません");
                            break;
                        case 2: //POSITION_UNAVAILABLE
                            alert("現在位置が取得できませんでした");
                            break;
                        case 3: //TIMEOUT
                            alert("タイムアウトになりました");
                            break;
                        default:
                            alert("その他のエラー(エラーコード:" + error.code + ")");
                            break;
                    }
                }
            );
        },

        touchStart: function (event) {
            if (event.button != 0) {
                return;
            }

            this.drawing = true;
            this.startX = event.offsetX - this.offset;
            this.startY = event.offsetY - this.offset;
            this.startP = event.pressure;

            this.undohist.push(this.context.getImageData(0, 0, this.width, this.height));
        },

        touchMove: function (event) {
            if (this.drawing) {

                var offsetX = event.offsetX - this.offset;
                var offsetY = event.offsetY - this.offset;

                var pressure = event.pressure;;
                if (pressure == 0) {
                    // iPad + safariだと筆圧検知していないときは「0」となる
                    pressure = this.startP;
                }

                // 試行用
                if (document.getElementById("random").checked) {
                    // 筆圧に乱数を使用
                    pressure = Math.random();;
                    document.getElementById("log").innerHTML = "乱数：" + pressure;
                } else {
                    document.getElementById("log").innerHTML = "実数：" + pressure;
                }

                var distance = Math.floor(Math.sqrt(Math.pow(offsetX - this.startX, 2) + Math.pow(offsetY - this.startY, 2)));
                var x_interval = Math.abs(offsetX - this.startX) / distance;
                var y_interval = Math.abs(offsetY - this.startY) / distance;
                var p_interval = Math.abs(pressure - this.startP) / distance;

                var wk_x = this.startX;
                var wk_y = this.startY;
                for (var i = 1; i <= distance; i++) {

                    var x_pos = this.startX + (x_interval * i) * (this.startX < offsetX ? 1 : -1);
                    var y_pos = this.startY + (y_interval * i) * (this.startY < offsetY ? 1 : -1);
                    var p_pos = this.startP + (p_interval * i) * (this.startP < pressure ? 1 : -1);

                    var width = (this.sizebar.value * p_pos) * 2
                    this.context.lineWidth = (width == 0 ? this.sizebar.value : width);

                    this.context.beginPath();
                    this.context.moveTo(wk_x, wk_y);
                    this.context.lineTo(x_pos, y_pos);
                    this.context.stroke();
                    wk_x = x_pos;
                    wk_y = y_pos;
                }

                this.startX = offsetX;
                this.startY = offsetY;
                this.startP = pressure;
            }
        },

        touchEnd: function (event) {
            this.drawing = false;
        }
    };

    window.addEventListener("load", function () {
        Draw.initialize();
    }, false);
})();
