//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-2015, Egret Technology Inc.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

module lark {

    /**
     * 格式化旋转角度的值
     */
    function clampRotation(value):number {
        value %= 360;
        if (value > 180) {
            value -= 360;
        } else if (value < -180) {
            value += 360;
        }
        return value;
    }

    const enum Values {
        scaleX,     //1
        scaleY,     //1
        skewX,      //0
        skewY,      //0
        rotation    //0
    }

    const enum M {
        a, b, c, d, tx, ty
    }

    /**
     * DisplayObject 类是可放在显示列表中的所有对象的基类。该显示列表管理运行时显示的所有对象。使用 DisplayObjectContainer 类排列显示列表中的显示对象。
     * DisplayObjectContainer 对象可以有子显示对象，而其他显示对象是“叶”节点，只有父级和同级，没有子级。
     * DisplayObject 类支持基本功能（如对象的 x 和 y 位置），也支持更高级的对象属性（如它的转换矩阵），所有显示对象都继承自 DisplayObject 类。
     * DisplayObject 类包含若干广播事件。通常，任何特定事件的目标均为一个特定的 DisplayObject 实例。
     * 若只有一个目标，则会将事件侦听器限制为只能放置到该目标上（在某些情况下，可放置到显示列表中该目标的祖代上），这意味着您可以向任何 DisplayObject 实例添加侦听器来侦听广播事件。
     */
    export class DisplayObject extends EventEmitter implements player.Renderable {

        /**
         * 创建一个显示对象
         */
        public constructor() {
            super();
            if (!this.fieldsInitialized) {//避免重复初始化
                this.initializeFields();
            }

        }

        private fieldsInitialized:boolean;

        /**
         * DisplayObject定义的所有变量请不要添加任何初始值，必须统一在此处初始化。否则UIComponent的多继承机制可能会触发两次DisplayObject的构造方法。
         */
        private initializeFields():void{
            this.fieldsInitialized = true;
            this.$displayObjectFlags = 0;
            this.$children = null;
            this.$parent = null;
            this.$stage = null;
            this.$nestLevel = 0;
            this._matrix = new Matrix();
            this._invertedConcatenatedMatrix = new Matrix();
            this.$visible = true;
            this.$displayList = null;
            this.$alpha = 1;
            this.$scrollRect = null;
            this.$blendMode = 0;
            this.$maskedObject = null;
            this.$mask = null;
            this._bounds = new lark.Rectangle();
            this._contentBounds = new lark.Rectangle();
            this.$parentDisplayList = null;
            this.$isDirty = false;
            this.$renderAlpha = 1;
            this.$renderMatrix = new lark.Matrix();
            this.$renderRegion = null;
            this.name = null;
            this.$displayObjectFlags = player.DisplayObjectFlags.InitFlags;
            this.displayObjectValues = new Float64Array([
                1,  //scaleX,
                1,  //scaleY,
                0,  //skewX,
                0,  //skewY,
                0   //rotation
            ]);
        }

        private displayObjectValues:Float64Array;

        $displayObjectFlags:number;

        $setFlags(flags:number):void {
            this.$displayObjectFlags |= flags;
        }

        $toggleFlags(flags:number, on:boolean):void {
            if (on) {
                this.$displayObjectFlags |= flags;
            } else {
                this.$displayObjectFlags &= ~flags;
            }
        }

        $removeFlags(flags:number):void {
            this.$displayObjectFlags &= ~flags;
        }

        /**
         * 沿着显示列表向上移除标志量，如果标志量没被设置过就停止移除。
         */
        $removeFlagsUp(flags:number):void {
            if (!this.$hasAnyFlags(flags)) {
                return;
            }
            this.$removeFlags(flags)
            var parent = this.$parent;
            if (parent) {
                parent.$removeFlagsUp(flags);
            }
        }

        $hasFlags(flags:number):boolean {
            return (this.$displayObjectFlags & flags) === flags;
        }

        /**
         * 沿着显示列表向上传递标志量，如果标志量已经被设置过就停止传递。
         */
        $propagateFlagsUp(flags:number):void {
            if (this.$hasFlags(flags)) {
                return;
            }
            this.$setFlags(flags);
            var parent = this.$parent;
            if (parent) {
                parent.$propagateFlagsUp(flags);
            }
        }

        /**
         * 沿着显示列表向下传递标志量，非容器直接设置自身的flag，此方法会在 DisplayObjectContainer 中被覆盖。
         */
        $propagateFlagsDown(flags:number):void {
            this.$setFlags(flags);
        }

        $hasAnyFlags(flags:number):boolean {
            return !!(this.$displayObjectFlags & flags);
        }

        private invalidateMatrix():void {
            this.$setFlags(player.DisplayObjectFlags.InvalidMatrix);
            this.invalidatePosition();
        }

        /**
         * 标记这个显示对象在父级容器的位置发生了改变。
         */
        private invalidatePosition():void {
            this.$invalidateTransform();
            this.$propagateFlagsDown(player.DisplayObjectFlags.InvalidConcatenatedMatrix |
                player.DisplayObjectFlags.InvalidInvertedConcatenatedMatrix);
            if (this.$parent) {
                this.$parent.$propagateFlagsUp(player.DisplayObjectFlags.InvalidBounds);
            }
        }

        /**
         * 能够含有子项的类将子项列表存储在这个属性里。
         */
        $children:DisplayObject[];

        /**
         * 表示 DisplayObject 的实例名称。
         * 通过调用父显示对象容器的 getChildByName() 方法，可以在父显示对象容器的子列表中标识该对象。
         */
        public name:string;

        $parent:DisplayObjectContainer;

        /**
         * 表示包含此显示对象的 DisplayObjectContainer 对象。
         * 使用 parent 属性可以指定高于显示列表层次结构中当前显示对象的显示对象的相对路径。
         */
        public get parent():DisplayObjectContainer {
            return this.$parent;
        }

        $setParent(parent:DisplayObjectContainer):void {
            this.$parent = parent;
        }

        $onAddToStage(stage:Stage, nestLevel:number):void {
            this.$stage = stage;
            this.$nestLevel = nestLevel;
            Sprite.$EVENT_ADD_TO_STAGE_LIST.push(this);
        }

        $onRemoveFromStage():void {
            this.$nestLevel = 0;
            Sprite.$EVENT_REMOVE_FROM_STAGE_LIST.push(this);
        }

        $stage:Stage;

        /**
         * 这个对象在显示列表中的嵌套深度，舞台为1，它的子项为2，子项的子项为3，以此类推。当对象不在显示列表中时此属性值为0.
         */
        $nestLevel:number;

        /**
         * 显示对象的舞台。
         * 例如，您可以创建多个显示对象并加载到显示列表中，每个显示对象的 stage 属性是指相同的 Stage 对象。
         * 如果显示对象未添加到显示列表，则其 stage 属性会设置为 null。
         */
        public get stage():Stage {
            return this.$stage;
        }

        private _matrix:Matrix;
        /**
         * 一个 Matrix 对象，其中包含更改显示对象的缩放、旋转和平移的值。
         * 注意：必须对matrix属性重新赋值改变的值才能生效，若获取matrix引用来修改对象属性，将不会发生任何改变。
         */
        public get matrix():Matrix {
            return this.$getMatrix().clone();
        }

        $getMatrix():Matrix {
            if (this.$hasFlags(player.DisplayObjectFlags.InvalidMatrix)) {
                var values = this.displayObjectValues;
                this._matrix.$updateScaleAndRotation(values[Values.scaleX], values[Values.scaleY], values[Values.skewX], values[Values.skewY]);
                this.$removeFlags(player.DisplayObjectFlags.InvalidMatrix);
            }
            return this._matrix;
        }

        public set matrix(value:Matrix) {
            this.$setMatrix(value);
            if (value) {
                this._matrix.copyFrom(value);
            }
        }

        $setMatrix(matrix:Matrix):void {
            if (this._matrix.equals(matrix)) {
                return;
            }
            var m = this._matrix;
            m.copyFrom(matrix);
            var values = this.displayObjectValues;
            values[Values.scaleX] = m.$getScaleX();
            values[Values.scaleY] = m.$getScaleY();
            values[Values.skewX] = matrix.$getSkewX();
            values[Values.skewY] = matrix.$getSkewY();
            values[Values.rotation] = clampRotation(values[Values.skewY] * 180 / Math.PI);
            this.$removeFlags(player.DisplayObjectFlags.InvalidMatrix);
            this.invalidatePosition();
        }


        /**
         * 获得这个显示对象以及它所有父级对象的连接矩阵。
         */
        $getConcatenatedMatrix():Matrix {
            if (this.$hasFlags(player.DisplayObjectFlags.InvalidConcatenatedMatrix)) {
                if (this.$parent) {
                    this.$parent.$getConcatenatedMatrix().$preMultiplyInto(this.$getMatrix(),
                        this.$renderMatrix);
                    var rect = this.$scrollRect;
                    if (rect) {
                        this.$renderMatrix.$preMultiplyInto($TempMatrix.setTo(1, 0, 0, 1, -rect.x, -rect.y), this.$renderMatrix)
                    }
                } else {
                    this.$renderMatrix.copyFrom(this.$getMatrix());
                }
                if (this.$displayList) {
                    this.$displayList.$renderRegion.moved = true;
                }
                if (this.$renderRegion) {
                    this.$renderRegion.moved = true;
                }
                this.$removeFlags(player.DisplayObjectFlags.InvalidConcatenatedMatrix);
            }
            return this.$renderMatrix;
        }

        private _invertedConcatenatedMatrix:Matrix;

        $getInvertedConcatenatedMatrix():Matrix {
            if (this.$hasFlags(player.DisplayObjectFlags.InvalidInvertedConcatenatedMatrix)) {
                this.$getConcatenatedMatrix().$invertInto(this._invertedConcatenatedMatrix);
                this.$removeFlags(player.DisplayObjectFlags.InvalidInvertedConcatenatedMatrix);
            }
            return this._invertedConcatenatedMatrix;
        }

        /**
         * 表示 DisplayObject 实例相对于父级 DisplayObjectContainer 本地坐标的 x 坐标。
         * 如果该对象位于具有变形的 DisplayObjectContainer 内，则它也位于包含 DisplayObjectContainer 的本地坐标系中。
         * 因此，对于逆时针旋转 90 度的 DisplayObjectContainer，该 DisplayObjectContainer 的子级将继承逆时针旋转 90 度的坐标系。
         */
        public get x():number {
            return this.$getX();
        }

        $getX():number {
            return this._matrix.$data[M.tx];
        }

        public set x(value:number) {
            this.$setX(value);
        }

        $setX(value:number):boolean {
            value = +value || 0;
            var values = this._matrix.$data;
            ;
            if (value === values[M.tx]) {
                return false;
            }
            values[M.tx] = value;
            this.invalidatePosition();
            return true;
        }

        /**
         * 表示 DisplayObject 实例相对于父级 DisplayObjectContainer 本地坐标的 y 坐标。
         * 如果该对象位于具有变形的 DisplayObjectContainer 内，则它也位于包含 DisplayObjectContainer 的本地坐标系中。
         * 因此，对于逆时针旋转 90 度的 DisplayObjectContainer，该 DisplayObjectContainer 的子级将继承逆时针旋转 90 度的坐标系。
         */
        public get y():number {
            return this.$getY();
        }

        $getY():number {
            return this._matrix.$data[M.ty];
        }

        public set y(value:number) {
            this.$setY(value);
        }

        $setY(value:number):boolean {
            value = +value || 0;
            var values = this._matrix.$data;
            if (value === values[M.ty]) {
                return false;
            }
            values[M.ty] = value;
            this.invalidatePosition();
            return true;
        }


        /**
         * 表示从注册点开始应用的对象的水平缩放比例（百分比）。
         * 缩放本地坐标系统将更改 x 和 y 属性值，这些属性值是以整像素定义的。
         * 默认值为 1，即不缩放。
         * @default 1
         */
        public get scaleX():number {
            return this.displayObjectValues[Values.scaleX];
        }

        public set scaleX(value:number) {
            this.$setScaleX(value);
        }

        $setScaleX(value:number):boolean {
            value = +value || 0;
            var values = this.displayObjectValues;
            if (value === values[Values.scaleX]) {
                return false;
            }
            values[Values.scaleX] = value;
            this.invalidateMatrix();
            return true;
        }

        /**
         * 表示从对象注册点开始应用的对象的垂直缩放比例（百分比）。
         * 缩放本地坐标系统将更改 x 和 y 属性值，这些属性值是以整像素定义的。
         * 默认值为 1，即不缩放。
         * @default 1
         */
        public get scaleY():number {
            return this.displayObjectValues[Values.scaleY];
        }

        public set scaleY(value:number) {
            this.$setScaleY(value);
        }

        $setScaleY(value:number):boolean {
            value = +value || 0;
            if (value === this.displayObjectValues[Values.scaleY]) {
                return false;
            }
            this.displayObjectValues[Values.scaleY] = value;
            this.invalidateMatrix();
            return true;
        }

        /**
         * 表示 DisplayObject 实例距其原始方向的旋转程度，以度为单位。
         * 从 0 到 180 的值表示顺时针方向旋转；从 0 到 -180 的值表示逆时针方向旋转。对于此范围之外的值，可以通过加上或
         * 减去 360 获得该范围内的值。例如，my_video.rotation = 450语句与 my_video.rotation = 90 是相同的。
         * @default 0 默认值为 0 不旋转。
         */
        public get rotation():number {
            return this.displayObjectValues[Values.rotation];
        }

        public set rotation(value:number) {
            value = +value || 0;
            value = clampRotation(value);
            var values = this.displayObjectValues;
            if (value === values[Values.rotation]) {
                return;
            }
            var delta = value - values[Values.rotation];
            var angle = delta / 180 * Math.PI;
            values[Values.skewX] += angle;
            values[Values.skewY] += angle;
            values[Values.rotation] = value;
            this.invalidateMatrix();
        }

        /**
         * 表示显示对象的宽度，以像素为单位。
         */
        public get width():number {
            return this.$getWidth();
        }

        $getWidth():number {
            return this.$getTransformedBounds(this.$parent, $TempRectangle).width;
        }

        public set width(value:number) {
            this.$setWidth(value);
        }

        $setWidth(value:number) {
            value = +value || 0;
            if (value < 0) {
                return;
            }
            var values = this.displayObjectValues;
            var originalBounds = this.$getOriginalBounds();
            var bounds = this.$getTransformedBounds(this.$parent, $TempRectangle);
            var angle = values[Values.rotation] / 180 * Math.PI;
            var baseWidth = originalBounds.$getBaseWidth(angle);
            if (!baseWidth) {
                return;
            }
            var baseHeight = originalBounds.$getBaseHeight(angle);
            values[Values.scaleY] = bounds.height / baseHeight;
            values[Values.scaleX] = value / baseWidth;
            this.invalidateMatrix();
        }

        /**
         * 表示显示对象的高度，以像素为单位。
         */
        public get height():number {
            return this.$getHeight();
        }

        $getHeight():number {
            return this.$getTransformedBounds(this.$parent, $TempRectangle).height;
        }

        public set height(value:number) {
            this.$setHeight(value);
        }

        $setHeight(value:number) {
            value = +value || 0;
            if (value < 0) {
                return;
            }
            var values = this.displayObjectValues;
            var originalBounds = this.$getOriginalBounds();
            var bounds = this.$getTransformedBounds(this.$parent, $TempRectangle);
            var angle = values[Values.rotation] / 180 * Math.PI;
            var baseHeight = originalBounds.$getBaseHeight(angle);
            if (!baseHeight) {
                return;
            }
            var baseWidth = originalBounds.$getBaseWidth(angle);
            values[Values.scaleY] = value / baseHeight;
            values[Values.scaleX] = bounds.width / baseWidth;
            this.invalidateMatrix();
        }

        $visible:boolean;

        /**
         * 显示对象是否可见。
         * 不可见的显示对象已被禁用。例如，如果实例的 visible=false，则无法单击该对象。
         * 默认值为 true 可见
         */
        public get visible():boolean {
            return this.$visible;
        }

        public set visible(value:boolean) {
            value = !!value;
            if (value === this.$visible) {
                return;
            }
            this.$visible = value;
            this.$invalidateTransform();
        }

        /**
         * cacheAsBitmap创建的缓存位图节点。
         */
        $displayList:lark.player.DisplayList;

        /**
         * 如果设置为 true，则 Lark 播放器将缓存显示对象的内部位图表示形式。此缓存可以提高包含复杂矢量内容的显示对象的性能。
         * 将 cacheAsBitmap 属性设置为 true 后，呈现并不更改，但是，显示对象将自动执行像素贴紧。执行速度可能会大大加快，
         * 具体取决于显示对象内容的复杂性。在内存超过上限的情况下，即使将 cacheAsBitmap 属性设置为 true，显示对象也不使用位图缓存。
         * 最好将 cacheAsBitmap 属性与主要具有静态内容且不频繁缩放和旋转的显示对象一起使用。
         */
        public get cacheAsBitmap():boolean {
            return this.$hasFlags(player.DisplayObjectFlags.CacheAsBitmap);
        }

        public set cacheAsBitmap(value:boolean) {
            value = !!value;
            this.$toggleFlags(player.DisplayObjectFlags.CacheAsBitmap, value);
            var hasDisplayList = !!this.$displayList;
            if (hasDisplayList === value) {
                return;
            }
            if (value) {
                var displayList = player.DisplayList.create(this);
                if (displayList) {
                    this.$displayList = displayList;
                    if (this.$parentDisplayList) {
                        this.$parentDisplayList.markDirty(displayList);
                    }
                    this.$cacheAsBitmapChanged();
                }
            }
            else {
                player.DisplayList.release(this.$displayList);
                this.$displayList = null;
                this.$cacheAsBitmapChanged();
            }
        }

        /**
         * cacheAsBitmap属性改变
         */
        $cacheAsBitmapChanged():void {
            var parentCache = this.$displayList || this.$parentDisplayList;
            if (this.$renderRegion) {
                parentCache.markDirty(this);
            }
        }

        /**
         * 渲染时会用到的属性，独立声明一个变量
         */
        $alpha:number;

        /**
         * 表示指定对象的 Alpha 透明度值。
         * 有效值为 0（完全透明）到 1（完全不透明）。alpha 设置为 0 的显示对象是活动的，即使它们不可见。
         *  @default 1 默认值为 1。
         */
        public get alpha():number {
            return this.$alpha;
        }

        public set alpha(value:number) {
            value = +value || 0;
            if (value === this.$alpha) {
                return;
            }
            this.$alpha = value;
            this.$propagateFlagsDown(player.DisplayObjectFlags.InvalidConcatenatedAlpha);
            this.$invalidate(true);
        }

        /**
         * 获取这个显示对象跟它所有父级透明度的乘积
         */
        $getConcatenatedAlpha():number {
            if (this.$hasFlags(player.DisplayObjectFlags.InvalidConcatenatedAlpha)) {
                if (this.$parent) {
                    var parentAlpha = this.$parent.$getConcatenatedAlpha();
                    this.$renderAlpha = parentAlpha * this.$alpha;
                }
                else {
                    this.$renderAlpha = this.$alpha;
                }
                this.$removeFlags(player.DisplayObjectFlags.InvalidConcatenatedAlpha);
            }
            return this.$renderAlpha;
        }

        /**
         * 指定此对象是否接收鼠标/触摸事件
         * @default true 默认为 true 即可以接收。
         */
        public get touchEnabled():boolean {
            return this.$hasFlags(player.DisplayObjectFlags.TouchEnabled);
        }

        public set touchEnabled(value:boolean) {
            this.$toggleFlags(player.DisplayObjectFlags.TouchEnabled, !!value);
        }

        /**
         * 是否开启精确像素碰撞。设置为true显示对象本身的透明区域将能够被穿透，设置为false将只检查显示对象测量的最大矩形区域。
         * 开启此属性将会有一定量的额外性能损耗，Shape和Sprite等含有矢量图的类默认开启此属性，其他类默认关闭。
         */
        public get pixelHitTest():boolean {
            return this.$hasFlags(player.DisplayObjectFlags.PixelHitTest);
        }

        public set pixelHitTest(value:boolean) {
            this.$toggleFlags(player.DisplayObjectFlags.PixelHitTest, !!value);
        }

        $scrollRect:Rectangle;

        /**
         * 显示对象的滚动矩形范围。显示对象被裁切为矩形定义的大小，当您更改 scrollRect 对象的 x 和 y 属性时，它会在矩形内滚动。
         * 注意：必须对scrollRect属性重新赋值改变的值才能生效，若获取scrollRect引用来修改对象属性，将不会发生任何改变。
         */
        public get scrollRect():Rectangle {
            return this.$scrollRect ? this.$scrollRect.clone() : null;
        }

        public set scrollRect(value:Rectangle) {
            if (!value && !this.$scrollRect) {
                return;
            }
            if (value) {
                if (!this.$scrollRect) {
                    this.$scrollRect = new lark.Rectangle();
                }
                this.$scrollRect.copyFrom(value);
            }
            else {
                this.$scrollRect = null;
            }
            this.invalidatePosition();
        }

        $blendMode:number;

        /**
         * BlendMode 枚举中的一个值，用于指定要使用的混合模式，确定如何将一个源（新的）图像绘制到目标（已有）的图像上
         * 如果尝试将此属性设置为无效值，则运行时会将此值设置为 BlendMode.NORMAL。
         */
        public get blendMode():string {
            return player.numberToBlendMode(this.$blendMode);
        }

        public set blendMode(value:string) {
            var mode = player.blendModeToNumber(value);
            if (mode === this.$blendMode) {
                return;
            }
            this.$blendMode = mode;
            this.$invalidateTransform();
        }

        /**
         * 被遮罩的对象
         */
        $maskedObject:DisplayObject;

        $mask:DisplayObject;

        /**
         * 调用显示对象被指定的 mask 对象遮罩。要确保当舞台缩放时蒙版仍然有效，mask 显示对象必须处于显示列表的活动部分。
         * 但不绘制 mask 对象本身。将 mask 设置为 null 可删除蒙版。要能够缩放遮罩对象，它必须在显示列表中。要能够拖动蒙版
         * Sprite 对象，它必须在显示列表中。
         * 注意：单个 mask 对象不能用于遮罩多个执行调用的显示对象。在将 mask 分配给第二个显示对象时，会撤消其作为第一个对象的遮罩，
         * 该对象的 mask 属性将变为 null。
         */
        public get mask():DisplayObject {
            return this.$mask;
        }

        public set mask(value:DisplayObject) {
            if (value === this.$mask || value === this) {
                return;
            }
            if (value) {
                if (value.$maskedObject) {
                    value.$maskedObject.mask = null;
                }
                value.$maskedObject = this;
            }
            this.$mask = value;
            this.$invalidateTransform();
        }

        /**
         * 返回一个矩形，该矩形定义相对于 targetCoordinateSpace 对象坐标系的显示对象区域。
         * @param targetCoordinateSpace 定义要使用的坐标系的显示对象。
         * @param resultRect 引擎建议尽可能减少创建对象次数来优化性能，可以从外部传入一个复用的Rectangle对象来存储结果，
         * 若不传入将创建一个新的Rectangle对象返回。
         * @returns 定义与 targetCoordinateSpace 对象坐标系统相关的显示对象面积的矩形。
         */
        public getBounds(targetCoordinateSpace:DisplayObject, resultRect?:Rectangle):Rectangle {
            targetCoordinateSpace = targetCoordinateSpace || this;
            return this.$getTransformedBounds(targetCoordinateSpace, resultRect);
        }

        $getTransformedBounds(targetCoordinateSpace:DisplayObject, resultRect?:Rectangle):Rectangle {
            var bounds = this.$getOriginalBounds();
            if (!resultRect) {
                resultRect = new Rectangle();
            }
            resultRect.copyFrom(bounds);
            if (targetCoordinateSpace === this || resultRect.isEmpty()) {
                return resultRect;
            }
            var m:Matrix;
            if (targetCoordinateSpace) {
                m = $TempMatrix;
                var invertedTargetMatrix = targetCoordinateSpace.$getInvertedConcatenatedMatrix();
                invertedTargetMatrix.$preMultiplyInto(this.$getConcatenatedMatrix(), m);
            } else {
                m = this.$getConcatenatedMatrix();
            }
            m.$transformBounds(resultRect);
            return resultRect;
        }

        /**
         * 将从舞台（全局）坐标转换为显示对象的（本地）坐标。
         * @param stageX 舞台坐标x
         * @param stageY 舞台坐标y
         * @param resultPoint 引擎建议尽可能减少创建对象次数来优化性能，可以从外部传入一个复用的Point对象来存储结果，
         * 若不传入将创建一个新的Point对象返回。
         * @returns 具有相对于显示对象的坐标的 Point 对象。
         */
        public globalToLocal(stageX:number, stageY:number, resultPoint?:Point):Point {
            var m = this.$getInvertedConcatenatedMatrix();
            return m.transformPoint(stageX, stageY, resultPoint);
        }

        /**
         * 将从舞台（全局）坐标转换为显示对象的（本地）坐标。
         * @param localX 舞台坐标x
         * @param localY 舞台坐标y
         * @param resultPoint 引擎建议尽可能减少创建对象次数来优化性能，可以从外部传入一个复用的Point对象来存储结果，
         * 若不传入将创建一个新的Point对象返回。
         * @returns 具有相对于显示对象的坐标的 Point 对象。
         */
        public localToGlobal(localX:number, localY:number, resultPoint?:Point):Point {
            var m = this.$getConcatenatedMatrix();
            return m.transformPoint(localX, localY, resultPoint);
        }

        /**
         * 标记自身的测量尺寸失效
         */
        $invalidateContentBounds():void {
            this.$invalidate();
            this.$setFlags(player.DisplayObjectFlags.InvalidContentBounds);
            this.$propagateFlagsUp(player.DisplayObjectFlags.InvalidBounds);
        }

        private _bounds:Rectangle;

        /**
         * 获取显示对象占用的矩形区域集合，通常包括自身绘制的测量区域，如果是容器，还包括所有子项占据的区域。
         */
        $getOriginalBounds():Rectangle {
            var bounds = this._bounds;
            if (this.$hasFlags(player.DisplayObjectFlags.InvalidBounds)) {
                bounds.copyFrom(this.$getContentBounds());
                this.$measureChildBounds(bounds);
                this.$removeFlags(player.DisplayObjectFlags.InvalidBounds);
                if (this.$displayList) {
                    this.$displayList.$renderRegion.moved = true;
                }
            }
            return bounds;
        }

        /**
         * 测量子项占用的矩形区域
         * @param bounds 测量结果存储在这个矩形对象内
         */
        $measureChildBounds(bounds:Rectangle):void {

        }

        private _contentBounds:Rectangle;

        $getContentBounds():Rectangle {
            var bounds = this._contentBounds;
            if (this.$hasFlags(player.DisplayObjectFlags.InvalidContentBounds)) {
                this.$measureContentBounds(bounds);
                if (this.$renderRegion) {
                    this.$renderRegion.moved = true;
                }
                this.$removeFlags(player.DisplayObjectFlags.InvalidContentBounds);
            }
            return bounds;
        }

        /**
         * 测量自身占用的矩形区域，注意：此测量结果并不包括子项占据的区域。
         * @param bounds 测量结果存储在这个矩形对象内
         */
        $measureContentBounds(bounds:Rectangle):void {

        }

        $parentDisplayList:lark.player.DisplayList;

        /**
         * 标记此显示对象需要重绘。此方法会触发自身的cacheAsBitmap重绘。如果只是矩阵改变，自身显示内容并不改变，应该调用$invalidateTransform().
         * @param notiryChildren 是否标记子项也需要重绘。传入false或不传入，将只标记自身需要重绘。通常只有alpha属性改变会需要通知子项重绘。
         */
        $invalidate(notifyChildren?:boolean):void {
            if (!this.$renderRegion || this.$hasFlags(player.DisplayObjectFlags.DirtyRender)) {
                return;
            }
            this.$setFlags(player.DisplayObjectFlags.DirtyRender);
            var displayList = this.$displayList ? this.$displayList : this.$parentDisplayList;
            if (displayList) {
                displayList.markDirty(this);
            }
        }

        /**
         * 标记自身以及所有子项在父级中变换叠加的显示内容失效。此方法不会触发自身的cacheAsBitmap重绘。
         * 通常用于矩阵改变或从显示列表添加和移除时。若自身的显示内容已经改变需要重绘，应该调用$invalidate()。
         */
        $invalidateTransform():void {
            if (this.$hasFlags(player.DisplayObjectFlags.DirtyChildren)) {
                return;
            }
            this.$setFlags(player.DisplayObjectFlags.DirtyChildren);
            var displayList = this.$displayList;
            if ((displayList || this.$renderRegion) && this.$parentDisplayList) {
                this.$parentDisplayList.markDirty(displayList || this);
            }
        }

        /**
         * 是否需要重绘的标志，此属性在渲染时会被访问，所以单独声明一个直接的变量。
         */
        $isDirty:boolean;
        /**
         * 这个对象在舞台上的整体透明度
         */
        $renderAlpha:number;
        /**
         * 在舞台上的矩阵对象
         */
        $renderMatrix:Matrix;
        /**
         * 此显示对象自身（不包括子项）在屏幕上的显示尺寸。
         */
        $renderRegion:player.Region;

        /**
         * 更新对象在舞台上的显示区域和透明度,返回显示区域是否发生改变。
         */
        $update():boolean {
            this.$removeFlagsUp(player.DisplayObjectFlags.Dirty);
            this.$getConcatenatedAlpha();
            var matrix = this.$getConcatenatedMatrix();
            var bounds = this.$getContentBounds();
            var stage = this.$stage;
            if (!stage) {
                return false;
            }
            var region = this.$renderRegion;
            if (!region.moved) {
                return false;
            }
            region.moved = false;
            region.updateRegion(bounds, matrix);
            return true;
        }

        /**
         * 执行渲染,绘制自身到屏幕
         */
        $render(context:player.RenderContext):void {

        }

        $hitTest(stageX:number, stageY:number, shapeFlag?:boolean):DisplayObject {
            if (!this.$renderRegion || !this.$visible || !this.$hasFlags(player.DisplayObjectFlags.TouchEnabled)) {
                return null;
            }
            var m = this.$getInvertedConcatenatedMatrix().$data;
            var bounds = this.$getContentBounds();
            var localX = m[M.a] * stageX + m[M.c] * stageY + m[M.tx];
            var localY = m[M.b] * stageX + m[M.d] * stageY + m[M.ty];
            if (bounds.contains(localX, localY)) {
                if (!this.$children) {//容器已经检查过scrollRect和mask，避免重复对遮罩进行碰撞。
                    if (this.$scrollRect && !this.$scrollRect.contains(localX, localY)) {
                        return null;
                    }
                    if (this.$mask && !this.$mask.$hitTest(stageX, stageY, true)) {
                        return null;
                    }
                }
                if (shapeFlag || this.$displayObjectFlags & player.DisplayObjectFlags.PixelHitTest) {
                    return this.hitTestPixel(localX, localY);
                }
                return this;
            }
            return null;
        }

        private hitTestPixel(localX:number, localY:number):DisplayObject {
            var alpha = this.$getConcatenatedAlpha();
            if (alpha === 0) {
                return null;
            }
            var context:player.RenderContext;
            var data:Uint8Array;
            var displayList = this.$displayList;
            if (displayList) {
                context = displayList.renderContext;
                data = context.getImageData(localX - displayList.offsetX, localY - displayList.offsetY, 1, 1).data;
            }
            else {
                context = player.sharedRenderContext;
                context.surface.width = context.surface.height = 3;
                context.translate(1 - localX, 1 - localY);
                this.$render(context);
                data = context.getImageData(1, 1, 1, 1).data;
            }
            if (data[3] === 0) {
                return null;
            }
            return this;
        }

        static $enterFrameCallBackList:DisplayObject[] = [];
        static $renderCallBackList:DisplayObject[] = [];

        public $addListener(type:string, listener:(event:Event)=>void, thisObject:any, useCapture?:boolean, priority?:number, emitOnce?:boolean):void {
            super.$addListener(type, listener, thisObject, useCapture, priority, emitOnce);
            var isEnterFrame = (type == Event.ENTER_FRAME);
            if (isEnterFrame || type == Event.RENDER) {
                var list = isEnterFrame ? DisplayObject.$enterFrameCallBackList : DisplayObject.$renderCallBackList;
                if (list.indexOf(this) == -1) {
                    list.push(this);
                }
            }
        }

        public removeListener(type:string, listener:(event:Event)=>void, thisObject:any, useCapture?:boolean):void {
            super.removeListener(type, listener, thisObject, useCapture);
            var isEnterFrame:boolean = (type == Event.ENTER_FRAME);
            if ((isEnterFrame || type == Event.RENDER) && !this.hasListener(type)) {
                var list = isEnterFrame ? DisplayObject.$enterFrameCallBackList : DisplayObject.$renderCallBackList;
                var index = list.indexOf(this);
                if (index !== -1) {
                    list.splice(index, 1);
                }
            }
        }

        public emit(event:Event):boolean {
            if (!event.$bubbles) {
                return super.emit(event);
            }

            var list:Array<DisplayObject> = [];
            var target:DisplayObject = this;
            while (target) {
                list.push(target);
                target = target.$parent;
            }
            event.$target = this;
            this.emitPropagationEvent(event, list);
            return !event.$isDefaultPrevented;
        }

        private emitPropagationEvent(event:Event, list:DisplayObject[]):void {
            var length:number = list.length;
            var eventPhase:number = EventPhase.CAPTURING_PHASE;
            for (var i:number = length - 1; i >= 0; i--) {
                var currentTarget:DisplayObject = list[i];
                event.$currentTarget = currentTarget;
                event.$eventPhase = eventPhase;
                currentTarget.$notifyListener(event);
                if (event.$isPropagationStopped || event.$isPropagationImmediateStopped) {
                    return;
                }
            }

            var eventPhase:number = EventPhase.AT_TARGET;
            var currentTarget:DisplayObject = list[0];
            event.$currentTarget = currentTarget;
            event.$eventPhase = eventPhase;
            currentTarget.$notifyListener(event);
            if (event.$isPropagationStopped || event.$isPropagationImmediateStopped) {
                return;
            }

            var eventPhase:number = EventPhase.BUBBLING_PHASE;
            for (i = 1; i < length; i++) {
                var currentTarget:DisplayObject = list[i];
                event.$currentTarget = currentTarget;
                event.$eventPhase = eventPhase;
                currentTarget.$notifyListener(event);
                if (event.$isPropagationStopped || event.$isPropagationImmediateStopped) {
                    return;
                }
            }
        }

        public willTrigger(type:string):boolean {
            var parent = this;
            while (parent) {
                if (parent.hasListener(type))
                    return true;
                parent = parent.$parent;
            }
            return false;
        }

    }
    registerType(DisplayObject, [Types.DisplayObject]);
}
