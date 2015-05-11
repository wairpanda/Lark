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

module lark.player {

    /**
     * GUI命名空间
     */
    export var NS_E:string = "http://ns.egret-labs.org/egret";
    /**
     * Wing命名空间
     */
    export var NS_W:string = "http://ns.egret-labs.org/wing";

    var basicTypes:string[] = ["Array", "boolean", "string", "number"];
    var GUI_MODULE = "lark.gui.";

    var hashCount = 0;

    export class EXMLConfig {

        private properties:any = {};

        private describe(instance:any):any {
            if (!instance) {
                return null;
            }
            var prototype = Object.getPrototypeOf(instance);
            if (!prototype) {
                return null;
            }
            var info:any;
            if(prototype.hasOwnProperty("__hashCode__")){

                info = this.properties[prototype.__hashCode__];
                if(info){
                    return info;
                }
            }

            var superProto = Object.getPrototypeOf(prototype);
            if (!superProto) {
                return null;
            }

            var superInstance = getInstanceOf(superProto.constructor);
            var superInfo = this.describe(superInstance);
            if (superInfo) {
                function factory():void {
                }

                factory.prototype = superInfo;
                info = new factory();
            }
            else {
                info = {};
            }
            if(DEBUG){
                info.__class__ = prototype.constructor.name;
            }
            var keys = Object.keys(prototype).concat(Object.keys(instance));
            var length = keys.length;
            var meta = instance.__meta__;
            for (var i = 0; i < length; i++) {
                var key = keys[i];
                if (key == "constructor" || key.charAt(0) == "_" || key.charAt(0) == "$") {
                    continue;
                }
                var resultType:string;
                if (meta && meta[key]) {
                    resultType = meta[key];
                }
                else if (isArray(instance[key])) {
                    resultType = "Array";
                }
                else {
                    resultType = typeof instance[key];
                    if (resultType == "function") {
                        continue;
                    }
                    if (basicTypes.indexOf(resultType) == -1) {
                        resultType = "any";
                    }
                }
                info[key] = resultType;
            }
            prototype.__hashCode__ = hashCount++;
            this.properties[prototype.__hashCode__] = info;
            return info;
        }

        /**
         * 根据类的短名ID和命名空间获取完整类名(以"."分隔)
         * @param id 类的短名ID
         * @param ns 命名空间
         */
        public getClassNameById(id:string, ns:string):string {
            var name:string = "";
            if (basicTypes.indexOf(id) != -1) {
                return id;
            }
            if (ns == NS_W) {

            }
            else if (!ns || ns == NS_E) {
                name = GUI_MODULE + id;
            }
            else {
                name = ns.substring(0, ns.length - 1) + id
            }
            if (!getPrototypeOf(name)) {
                name = "";
            }
            return name;
        }

        /**
         * 根据ID获取对应的默认属性
         * @param id 类的短名ID
         * @param ns 命名空间
         * @return 默认属性名
         */
        public getDefaultPropById(id:string, ns:string):string {
            var className:string = this.getClassNameById(id, ns);
            var prototype = getPrototypeOf(className);
            if (!prototype) {
                name = "";
            }
            return prototype.__defaultProperty__;
        }

        /**
         * 获取指定属性的类型,返回基本数据类型："boolean","string","number","any"。
         * @param property 属性名
         * @param className 要查询的完整类名
         */
        public getPropertyType(property:string, className:string):string {
            if (className == "Object") {
                return "any";
            }
            var resultType:string = "";
            var prototype = getPrototypeOf(className);
            if (prototype) {
                if (!prototype.hasOwnProperty("__hashCode__")) {
                    var clazz = getDefinitionByName(className);
                    var instance = getInstanceOf(clazz);
                    if (!instance) {
                        if (DEBUG) {
                            $warn(2104, className);
                        }
                        return resultType;
                    }
                    this.describe(instance);
                }
                var info = this.properties[prototype.__hashCode__];
                if (info) {
                    resultType = info[property];
                }
            }
            return resultType;
        }
    }

    /**
     * 判断一个对象是数组
     */
    function isArray(o:any):boolean {
        return Object.prototype.toString.call(o) === '[object Array]';
    }

    /**
     * 获取一个类名对应的prototype引用
     */
    function getPrototypeOf(className:string):any {
        var clazz = getDefinitionByName(className);
        if (!clazz) {
            return null;
        }
        return clazz.prototype;
    }

    /**
     * 创建一个类名对应的实例
     */
    function getInstanceOf(clazz:any):any {
        if (!clazz) {
            return null;
        }
        try {
            var instance = new clazz();
        }
        catch (e) {
            return null;
        }
        return instance;
    }

}