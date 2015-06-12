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
     * @language en_US
     * @version Lark 1.0
     * @version Swan 1.0
     * @platform Web,Native
     */
    /**
     * @language zh_CN
     * @version Lark 1.0
     * @version Swan 1.0
     * @platform Web,Native
     */
    export class GUI extends swan.Group {

        /**
         * @language en_US
         * @version Lark 1.0
         * @version Swan 1.0
         * @platform Web,Native
         */
        /**
         * @language zh_CN
         * @version Lark 1.0
         * @version Swan 1.0
         * @platform Web,Native
         */
        public constructor() {
            super();
        }

        /**
         * @language en_US
         * 
         * @version Lark 1.0
         * @version Swan 1.0
         * @platform Web,Native
         */
        /**
         * @language zh_CN
         * 
         * @version Lark 1.0
         * @version Swan 1.0
         * @platform Web,Native
         */
        protected createChildren():void {
            super.createChildren();

            new swan.Theme("tests/theme.json",this.stage);

            this.width = this.stage.stageWidth;
            this.height = this.stage.stageHeight;
            var component = new swan.Component();
            component.skinName = "tests/List.exml";
            component.horizontalCenter = 0;
            component.verticalCenter = 0;
            component.once(lark.Event.COMPLETE,this.onLoaded,this);
            var button = new swan.Button();
            this.addChild(button);
            var button2 = new swan.Button();
            var image = new swan.Image();
            image.source = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEkAAAAaCAIAAAB0C+bSAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAElJREFUeNrs0UENwDAMALGsKqPhLpSAyL8c2vcYTJGPgXXPu040beZuKqsc0Tc2NjY2NjY2NjY2NjY2NjY2tm8zKn1j+1NXgAEAVEMHLB0TEsYAAAAASUVORK5CYII=";
            image.horizontalCenter = 0;
            this.addChild(image);
            this.addChild(button2);
            this.addChild(component);
        }

        /**
         * @private
         * 
         * @param event 
         */
        private onLoaded(event:Event):void{
            var component = event.currentTarget;
            var list = component["list"];
            var button = new swan.Button();
            list.addChild(button);
        }

        /**
         * @private
         */
        private touchTarget:swan.UIComponent;
        /**
         * @private
         */
        private offsetX:number = 0;
        /**
         * @private
         */
        private offsetY:number = 0;

        /**
         * @private
         * 
         * @param event 
         */
        private onTouchBegin(event:TouchEvent):void {
            var target = <swan.UIComponent>event.target;
            this.touchTarget = target;

            //target.includeInLayout = false;
            //var pos = target.parent.localToGlobal(target.x, target.y);
            //this.addChild(target);
            //pos = target.parent.globalToLocal(pos.x, pos.y);
            //target.x = pos.x;
            //target.y = pos.y;
            //this.offsetX = target.x - event.stageX;
            //this.offsetY = target.y - event.stageY;
            //this.stage.on(TouchEvent.TOUCH_MOVE, this.onTouchMove, this);
            //this.stage.on(TouchEvent.TOUCH_END, this.onTouchEnd, this);
            //event.updateAfterEvent();
        }

        /**
         * @private
         * 
         * @param event 
         */
        private onTouchMove(event:TouchEvent):void {
            this.touchTarget.x = this.offsetX + event.stageX;
            this.touchTarget.y = this.offsetY + event.stageY;
            event.updateAfterEvent();
        }

        /**
         * @private
         * 
         * @param event 
         */
        private onTouchEnd(event:TouchEvent):void {
            this.touchTarget = null;
            this.stage.removeListener(TouchEvent.TOUCH_MOVE, this.onTouchMove, this);
            this.stage.removeListener(TouchEvent.TOUCH_END, this.onTouchEnd, this);
            event.updateAfterEvent();
        }
    }
}