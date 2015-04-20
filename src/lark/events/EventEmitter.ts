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

    class EventDataHost {

        public constructor(target:IEventEmitter) {
            this.eventTarget = target;
        }

        /**
         * 事件抛出对象
         */
        public eventTarget:IEventEmitter;

        public eventsMap:any = {};

        public captureEventsMap:any = {};

        public notifyLevel:number = 0;
    }

    var ONCE_EVENT_LIST:lark.player.EventBin[] = [];

    /**
     * EventEmitter 是 Lark 的事件派发器类，负责进行事件的发送和侦听。
     *
     * 事件目标是事件如何通过显示列表层次结构这一问题的焦点。当发生鼠标单击、触摸或按键等事件时，
     * 引擎会将事件对象调度到从显示列表根开始的事件流中。然后该事件对象在显示列表中前进，直到到达事件目标，
     * 然后从这一点开始其在显示列表中的回程。在概念上，到事件目标的此往返行程被划分为三个阶段：
     * 捕获阶段包括从根到事件目标节点之前的最后一个节点的行程，目标阶段仅包括事件目标节点，冒泡阶段包括回程上遇到的任何后续节点到显示列表的根。
     */
    export class EventEmitter extends HashObject implements IEventEmitter {

        /**
         * EventEmitter 类是可调度事件的所有类的基类。
         * EventEmitter 类实现 IEventEmitter 接口 ，并且是 DisplayObject 类的基类。
         * EventEmitter 类允许显示列表上的任何对象都是一个事件目标，同样允许使用 IEventEmitter 接口的方法。
         */
        public constructor(target:IEventEmitter = null) {
            super();
            this.eventDataHost = new EventDataHost(target ? target : this);

        }

        private eventDataHost:EventDataHost;

        /**
         * 添加事件侦听器
         * @param type 事件的类型。
         * @param listener 处理事件的侦听器函数。此函数必须接受 Event 对象作为其唯一的参数，并且不能返回任何结果，
         * 如下面的示例所示： function(evt:Event):void 函数可以有任何名称。
         * @param thisObject 侦听函数绑定的this对象
         * @param useCapture 确定侦听器是运行于捕获阶段还是运行于目标和冒泡阶段。如果将 useCapture 设置为 true，
         * 则侦听器只在捕获阶段处理事件，而不在目标或冒泡阶段处理事件。如果 useCapture 为 false，则侦听器只在目标或冒泡阶段处理事件。
         * 要在所有三个阶段都侦听事件，请调用 on() 两次：一次将 useCapture 设置为 true，一次将 useCapture 设置为 false。
         * @param  priority 事件侦听器的优先级。优先级由一个带符号的 32 位整数指定。数字越大，优先级越高。优先级为 n 的所有侦听器会在
         * 优先级为 n -1 的侦听器之前得到处理。如果两个或更多个侦听器共享相同的优先级，则按照它们的添加顺序进行处理。默认优先级为 0。
         */
        public on(type:string, listener:(event:Event)=>void, thisObject:any, useCapture?:boolean, priority?:number):void {
            this.$addListener(type, listener, thisObject, useCapture, priority);
        }

        /**
         * 添加仅回调一次的事件侦听器，此方法与on()方法不同，on()方法会持续产生回调，而此方法在第一次回调时就会自动移除监听。
         * @param type 事件的类型。
         * @param listener 处理事件的侦听器函数。此函数必须接受 Event 对象作为其唯一的参数，并且不能返回任何结果，
         * 如下面的示例所示： function(evt:Event):void 函数可以有任何名称。
         * @param thisObject 侦听函数绑定的this对象
         * @param useCapture 确定侦听器是运行于捕获阶段还是运行于目标和冒泡阶段。如果将 useCapture 设置为 true，
         * 则侦听器只在捕获阶段处理事件，而不在目标或冒泡阶段处理事件。如果 useCapture 为 false，则侦听器只在目标或冒泡阶段处理事件。
         * 要在所有三个阶段都侦听事件，请调用 on() 两次：一次将 useCapture 设置为 true，一次将 useCapture 设置为 false。
         * @param  priority 事件侦听器的优先级。优先级由一个带符号的 32 位整数指定。数字越大，优先级越高。优先级为 n 的所有侦听器会在
         * 优先级为 n -1 的侦听器之前得到处理。如果两个或更多个侦听器共享相同的优先级，则按照它们的添加顺序进行处理。默认优先级为 0。
         */
        public once(type:string, listener:(event:Event)=>void, thisObject:any, useCapture?:boolean, priority?:number):void {
            this.$addListener(type, listener, thisObject, useCapture, priority, true);
        }

        $addListener(type:string, listener:(event:Event)=>void, thisObject:any, useCapture?:boolean, priority?:number, emitOnce?:boolean):void {
            if (DEBUG && !listener) {
                $error(1003, "listener");
            }
            var host = this.eventDataHost;
            var eventMap:any = useCapture ? host.captureEventsMap : host.eventsMap;
            var list:lark.player.EventBin[] = eventMap[type];
            if (!list) {
                list = eventMap[type] = [];
            }
            else if (host.notifyLevel !== 0) {
                eventMap[type] = list = list.concat();
            }
            priority = +priority | 0;
            var insertIndex = -1;
            var length = list.length;
            for (var i = 0; i < length; i++) {
                var bin = list[i];
                if (bin.listener === listener && bin.thisObject === thisObject && bin.target === this) {
                    return;
                }
                if (insertIndex === -1 && bin.priority < priority) {
                    insertIndex = i;
                }
            }
            var eventBin:lark.player.EventBin = {
                type: type, listener: listener, thisObject: thisObject, priority: priority,
                target: this, useCapture: useCapture, emitOnce: !!emitOnce
            };
            if (insertIndex !== -1) {
                list.splice(insertIndex, 0, eventBin);
            }
            else {
                list.push(eventBin);
            }
        }

        /**
         * 移除事件侦听器
         * @param type 事件名
         * @param listener 侦听函数
         * @param thisObject 侦听函数绑定的this对象
         * @param useCapture 是否使用捕获，这个属性只在显示列表中生效。
         */
        public removeListener(type:string, listener:(event:Event)=>void, thisObject:any, useCapture?:boolean):void {

            var host = this.eventDataHost;
            var eventMap:Object = useCapture ? host.captureEventsMap : host.eventsMap;
            var list:lark.player.EventBin[] = eventMap[type];
            if (!list) {
                return;
            }
            if (host.notifyLevel !== 0) {
                eventMap[type] = list = list.concat();
            }
            var length = list.length;
            for (var i = 0; i < length; i++) {
                var bin = list[i];
                if (bin.listener === listener && bin.thisObject === thisObject && bin.target === this) {
                    list.splice(i, 1);
                    break;
                }
            }
            if (list.length == 0) {
                eventMap[type] = null;
            }
        }

        /**
         * 检测是否存在监听器
         * @param type 事件类型
         * @returns 是否存在监听器，若存在返回true，反之返回false。
         */
        public hasListener(type:string):boolean {
            var host = this.eventDataHost;
            return (host.eventsMap[type] || host.captureEventsMap[type]);
        }

        /**
         * 检查是否用此 EventEmitter 对象或其任何始祖为指定事件类型注册了事件侦听器。将指定类型的事件调度给此
         * EventEmitter 对象或其任一后代时，如果在事件流的任何阶段触发了事件侦听器，则此方法返回 true。
         * hasListener() 与 willTrigger() 方法的区别是：hasListener() 只检查它所属的对象，
         * 而 willTrigger() 方法检查整个事件流以查找由 type 参数指定的事件。
         * @param type 事件类型
         * @returns 是否注册过监听器，如果注册过返回true，反之返回false
         */
        public willTrigger(type:string):boolean {
            return this.hasListener(type);
        }


        /**
         * 将事件分派到事件流中。事件目标是对其调用 emit() 方法的 EventEmitter 对象。
         * @param event 调度到事件流中的 Event 对象。
         * @returns 如果成功调度了事件，则值为 true。值 false 表示失败或对事件调用了 preventDefault()。
         */
        public emit(event:Event):boolean {
            event.$target = event.$currentTarget = this.eventDataHost.eventTarget;
            return this.$notifyListener(event);
        }

        $notifyListener(event:Event):boolean {
            var host = this.eventDataHost;
            var eventMap:Object = event.$eventPhase == 1 ? host.captureEventsMap : host.eventsMap;
            var list:lark.player.EventBin[] = eventMap[event.$type];
            if (!list) {
                return true;
            }
            var length = list.length;
            if (length === 0) {
                return true;
            }
            var onceList = ONCE_EVENT_LIST;
            //做个标记，防止外部修改原始数组导致遍历错误。这里不直接调用list.concat()因为emit()方法调用通常比on()等方法频繁。
            host.notifyLevel++;
            for (var i = 0; i < length; i++) {
                var eventBin = list[i];
                eventBin.listener.call(eventBin.thisObject, event);
                if (eventBin.emitOnce) {
                    onceList.push(eventBin);
                }
                if (event.$isPropagationImmediateStopped) {
                    break;
                }
            }
            host.notifyLevel--;
            while (onceList.length) {
                eventBin = onceList.pop();
                eventBin.target.removeListener(eventBin.type, eventBin.listener, eventBin.thisObject, eventBin.useCapture);
            }
            return !event.$isDefaultPrevented;
        }

        /**
         * 派发一个包含了特定参数的事件到所有注册了特定类型侦听器的对象中。 这个方法使用了一个内部的事件对象池因避免重复的分配导致的额外开销。
         * @param type 事件类型
         * @param bubbles 是否冒泡，默认false
         * @param data 附加数据(可选)
         * @returns 如果成功调度了事件，则值为 true。值 false 表示失败或对事件调用了 preventDefault()。
         */
        public emitWith(type:string, bubbles?:boolean, data?:any):boolean {
            if (bubbles || this.hasListener(type)) {
                var event = Event.create(Event, type, bubbles);
                event.data = data;
                var result = this.emit(event);
                Event.release(event);
                return result;
            }
        }
    }
}

module lark.player {
    /**
     * 事件信息对象
     */
    export interface EventBin {
        type:string;
        listener: (event:Event)=>void;
        thisObject:any;
        priority:number;
        target:IEventEmitter;
        useCapture:boolean;
        emitOnce:boolean;
    }
}