<template>
    <div class="image-uploader">
        <div class="block-grid">
            {{label}}
            <div v-if="!image">
                <input type="file" @change="onFileChange"> <span class="error">{{error}}</span>
            </div>
            <div v-else>
                <button @click="removeImage">Remove</button>
                <img :src="image" v-on:load="getSize" :height="'100px'">
                <div v-if="needCrop" class="crop-overlay" @mouseup="disableSelection" @mouseleave="disableSelection" @mousemove="updateRec">
                    <div class="crop-modal">
                        <button v-on:click="cancelCrop" class="btn btn-warning">Cancel</button>
                        <button v-on:click="clip" class="btn btn-primary">Clip</button>
                        <hr>
                        <div class="crop-wrap">
                            <div class="image-for-crop">
                                <img :src="image" :style="{'max-width': '500px', 'max-height': '400px'}" v-on:load="getViewSize" class="shadow-img">
                            </div>
                            <div class="shadow-box" :style="{top: 0, left: 0, width: rec.l+'px', height: rec.t+'px'}"></div>
                            <div class="shadow-box" :style="{top: 0, left: rec.l+'px', width: rec.w+'px', height: rec.t+'px'}"></div>
                            <div class="shadow-box" :style="{top: 0, left: (rec.l + rec.w)+'px', width: (viewWidth - rec.w - rec.l)+'px', height: rec.t+'px'}"></div>
                            <div class="shadow-box" :style="{top: rec.t+'px', left: (rec.l + rec.w)+'px', width: (viewWidth - rec.w - rec.l)+'px', height: rec.h+'px'}"></div>
                            <div class="shadow-box" :style="{top: (rec.t + rec.h)+'px', left: (rec.l + rec.w)+'px', width: (viewWidth - rec.w - rec.l)+'px', height: (viewHeight - rec.h - rec.t)+'px'}"></div>
                            <div class="shadow-box" :style="{top: (rec.t + rec.h)+'px', left: rec.l+'px', width: rec.w+'px', height: (viewHeight - rec.h - rec.t)+'px'}"></div>
                            <div class="shadow-box" :style="{top: (rec.t + rec.h)+'px', left: 0, width: rec.l+'px', height: (viewHeight - rec.h - rec.t)+'px'}"></div>
                            <div class="shadow-box" :style="{top: rec.t+'px', left: 0, width: rec.l+'px', height: rec.h+'px'}"></div>
                            <div class="crop-box"
                                 @mousedown="boxMouseDown"
                                 :style="{left: rec.l+'px', top: rec.t+'px', width: rec.w+'px', height: rec.h+'px'}">
                                <span class="drag-point point-lt" @mousedown="pointMouseDown('drag-lt', $event)"></span>
                                <span class="drag-point point-lb" @mousedown="pointMouseDown('drag-lb', $event)"></span>
                                <span class="drag-point point-rt" @mousedown="pointMouseDown('drag-rt', $event)"></span>
                                <span class="drag-point point-rb" @mousedown="pointMouseDown('drag-rb', $event)"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
    export default {
        name: 'image-upload',
        props: {
            label: String,
            width: Number,
            height: Number,
            init: String
        },
        data: function () {
            return {
                image: this.init,
                error: '',
                viewWidth: 0,
                viewHeight: 0,
                naturalWidth: 0,
                naturalHeight: 0,
                pl: 0,
                pt: 0,
                rec: { w: 0, h: 0, l: 0, t: 0 }, // our crop
                action: '', // draging or resizing
                actionPoint: { x: 0, y: 0 }, // point that we drag
                referPoint: { x: 0, y: 0 }, // opposite to action point
                imageEntity: null,
                needCrop: false
            }
        },
        watch: {
            init: function () {
                if (this.init == '') {
                    this.image = '';
                }
            },
            needCrop: function () {
                if (this.needCrop) {
                    document.body.classList.add('disable-selection');
                } else {
                    document.body.classList.remove('disable-selection');
                }
            }
        },
        computed: {
            viewRatio: function () {
                if (this.viewWidth == 0) {
                    return 0;
                }
                return this.naturalWidth / parseFloat(this.viewWidth);
            },
            ratio: function () {
                if (this.height == 0) {
                    return 0;
                }
                return parseFloat(this.width) / parseFloat(this.height);
            },
            cursorType: function () {
                switch (this.action) {
                    case 'move':
                        return 'move';
                    case 'drag-lt':
                        return 'nw-resize';
                    case 'drag-rt':
                        return 'ne-resize';
                    case 'drag-rb':
                        return 'se-resize';
                    case 'drag-lb':
                        return 'sw-resize';
                    default:
                        return 'auto';
                }
            }
        },
        methods: {
            onFileChange: function (e) {
                var files = e.target.files || e.dataTransfer.files;
                if (!files.length) {
                    return;
                }
                this.createImage(files[0]);
            },
            createImage: function (file) {
                var image = new Image();
                var reader = new FileReader();
                var vm = this;
                reader.onload = function (e) {
                    vm.image = e.target.result;
                    image.src = e.target.result;
                };
                image.onload = function () {
                    vm.imageEntity = image;
                };
                reader.readAsDataURL(file);
            },
            removeImage: function (e) {
                this.image = '';
                this.$emit('input', '');
            },
            getSize: function (e) {
                if (this.width > e.target.naturalWidth || this.height > e.target.naturalHeight) {
                    this.error = 'Минимальный размер картинки - '+this.width+'X'+this.height;
                    this.image = '';
                    return false;
                }
                this.naturalWidth = e.target.naturalWidth;
                this.naturalHeight = e.target.naturalHeight;
                this.error = '';
                if (this.width == e.target.naturalWidth && this.height == e.target.naturalHeight) {
                    this.$emit('input', this.image);
                    return true;
                } else {
                    this.needCrop = true;
                }
            },
            getViewSize: function (e) {
                this.viewWidth = e.target.width;
                this.viewHeight = e.target.height;
                this.rec.w = parseFloat(this.width) / this.viewRatio;
                this.rec.h = parseFloat(this.height) / this.viewRatio;
                this.rec.l = 0;
                this.rec.t = 0;
            },
            getLeft: function (el) {
                let left = el.offsetLeft;
                let parent = el.offsetParent;
                while (parent) {
                    left += parent.offsetLeft;
                    parent = parent.offsetParent;
                }
                return left;
            },
            getTop: function (el) {
                let top = el.offsetTop;
                let parent = el.offsetParent;
                while (parent) {
                    top += parent.offsetTop;
                    parent = parent.offsetParent;
                }
                return top;
            },
            // start action of updating rec
            initAction: function (name, x, y) {
                this.action = name;
                this.actionPoint = {x, y};
                this.referPoint = {x: this.rec.l, y: this.rec.t};
                switch (name) {
                    case 'drag-lt':
                        this.referPoint = { x: this.rec.l + this.rec.w, y: this.rec.t + this.rec.h };
                        break;
                    case 'drag-lb':
                        this.referPoint = { x: this.rec.l + this.rec.w, y: this.rec.t };
                        break;
                    case 'drag-rt':
                        this.referPoint = { x: this.rec.l, y: this.rec.t + this.rec.h };
                        break;
                    case 'drag-rb':
                        this.referPoint = { x: this.rec.l, y: this.rec.t };
                        break;
                }
            },
            // on crop box corners click - start drag action
            pointMouseDown: function (name, e) {
                this.pl = this.getLeft(e.target.offsetParent.offsetParent);
                this.pt = this.getTop(e.target.offsetParent.offsetParent);
                this.initAction(name, e.x, e.y);
                e.stopPropagation();
            },
            boxMouseDown: function (e) {
                this.pl = this.getLeft(e.target.offsetParent);
                this.pt = this.getTop(e.target.offsetParent);
                this.initAction('move', e.x, e.y);
                e.stopPropagation();
            },
            updateRec: function (e) {
                if (!this.action) {
                    return;
                }

                const elWidth = this.viewWidth;
                const elHeight = this.viewHeight;
                const x = e.x > this.viewWidth + this.pl ? this.viewWidth + this.pl : (e.x < this.pl ? this.pl : e.x);
                const y = e.y > this.viewHeight + this.pt ? this.viewHeight + this.pt : (e.y < this.pt ? this.pt : e.y);
                const dx = x - this.actionPoint.x;
                const dy = y - this.actionPoint.y;
                let w = 0;
                let h = 0;
                let t = 0;
                let l = 0;

                if (dx === 0 && dy === 0) {
                    return;
                }

                switch (this.action) {
                    // resize
                    case 'drag-lt':
                    case 'drag-rt':
                    case 'drag-rb':
                    case 'drag-lb':
                        w = x - (this.referPoint.x + this.pl);
                        h = y - (this.referPoint.y + this.pt);

                        if (Math.abs(w) < this.width / this.viewRatio)  {
                            w = (w >= 0 ? 1 : -1) * this.width / this.viewRatio;
                        }
                        if (Math.abs(h) < this.height / this.viewRatio)  {
                            h = (h >= 0 ? 1 : -1) * this.height / this.viewRatio;
                        }

                        if (Math.abs(w) / this.ratio > Math.abs(h)) {
                            w = Math.abs(h) * (w >= 0 ? 1 : -1) / this.ratio;
                        } else {
                            h = Math.abs(w) * (h >= 0 ? 1 : -1) / this.ratio;
                        }
                        if (w < 0 && h < 0) {
                            this.rec.l = this.referPoint.x + w;
                            this.rec.t = this.referPoint.y + h;
                        } else if (w < 0 && h >= 0) {
                            this.rec.l = this.referPoint.x + w;
                            this.rec.t = this.referPoint.y;
                        } else if (w >= 0 && h < 0) {
                            this.rec.l = this.referPoint.x;
                            this.rec.t = this.referPoint.y + h;
                        } else if (w >= 0 && h >= 0) {
                            this.rec.l = this.referPoint.x;
                            this.rec.t = this.referPoint.y;
                        }
                        w = Math.abs(w);
                        h = Math.abs(h);


                        this.rec.w = w;
                        this.rec.h = h;
                        break;
                    // move
                    case 'move':
                        t = dy + this.referPoint.y;
                        l = dx + this.referPoint.x;

                        if (t <= 0) {
                            t = 0;
                        } else if (t + this.rec.h >= elHeight) {
                            t = elHeight - this.rec.h;
                        }
                        if (l <= 0) {
                            l = 0;
                        } else if (l + this.rec.w >= elWidth) {
                            l = elWidth - this.rec.w;
                        }

                        this.rec.l = l;
                        this.rec.t = t;
                        break;
                }
            },
            disableSelection: function (e) {
                if (this.action) {
                    this.action = '';
                }
            },
            cancelCrop: function () {
                this.image = '';
                this.needCrop = false;
            },
            clip: function () {
                const bufferCanvas = document.createElement('canvas');
                const bfx = bufferCanvas.getContext('2d');
                const k = this.naturalWidth / parseFloat(this.viewWidth);
                bufferCanvas.width = this.width;
                bufferCanvas.height = this.height;
                bfx.drawImage(this.imageEntity, this.rec.l * k, this.rec.t * k, this.rec.w * k, this.rec.h * k, 0, 0, this.width, this.height);
                this.image = bufferCanvas.toDataURL('image/jpeg', 1);
                this.needCrop = false;
            }
        },
    }
</script>
<style scoped>
    .crop-overlay {
        position: fixed;
        left: 0;
        top: 0;
        background: rgba(0,0,0,0.9);
        width: 100%;
        height: 100%;
        z-index: 9999;
    }
    .shadow-img {

    }
    .crop-modal {
        width: 80%;
        margin: 0 auto;
        height: 100%;
        overflow-y: auto;
        background: #fff;
        padding: 20px;
        text-align: center;
    }
    .image-uploader {
        padding: 0 15px;
        margin: 10px auto;
        display: inline-block;
        
    }
    .block-grid {
        padding: 10px;
        border: 1px solid #e5e5e5;
        border-radius: 4px;
    }
    .error {
        color: #ff6766;
    }
    .crop-wrap {
        display: inline-block;
        position: relative;
        top: 0;
        left: 0;
        z-index: 10;
    }
    .shadow-box {
        position: absolute;
        z-index: 12;
        background: rgba(0, 0, 0, 0.6);
    }
    .crop-box {
        position: absolute;
        display: block;
        cursor: move;
        border: 1px dashed #fff;
        z-index: 20;
    }
    .crop-box.show {
        display: block;
    }
    .drag-point {
        display: inline-block;
        width: 10px;
        height: 10px;
        border: 2px solid #fff;
        position: absolute;
        background: #fff;
    }
    .point-lt {
        top: -5px;
        left: -5px;
        cursor: nw-resize;
    }
    .point-lb {
        left: -5px;
        bottom: -5px;
        cursor: sw-resize;
    }
    .point-rt {
        right: -5px;
        top: -5px;
        cursor: ne-resize;
    }
    .point-rb {
        right: -5px;
        bottom: -5px;
        cursor: se-resize;
    }
</style>