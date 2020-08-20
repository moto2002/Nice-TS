/*
 * Tencent is pleased to support the open source community by making Puerts available.
 * Copyright (C) 2020 THL A29 Limited, a Tencent company.  All rights reserved.
 * Puerts is licensed under the BSD 3-Clause License, except for the third-party components listed in the file 'LICENSE' which may be subject to their corresponding license terms. 
 * This file is subject to the terms and conditions defined in file 'LICENSE', which is part of this source code package.
 */

var global = global || (function () { return this; }());
(function (global) {
    "use strict";
    
    let loadModule = function(moduleName, requiringDir) {
        let path = puerts.searchModule(requiringDir, moduleName);
        if (!path) throw new Error("can not find " + moduleName);
        let {context, debugPath} = puerts.loadFile(path);
        return {fullPath: path, debugPath: debugPath, script: context}
    }

    let moduleCache = Object.create(null);
    let buildinModule = Object.create(null);
    function executeModule(fullPath, script, debugPath) {
        let fullPathInJs = fullPath.replace(/\\/g, '\\\\');
        let fullDirInJs = (fullPath.indexOf('/') != -1) ? fullPath.substring(0, fullPath.lastIndexOf("/")) : fullPath.substring(0, fullPath.lastIndexOf("\\")).replace(/\\/g, '\\\\');
        let executeScript = "(function() { var __filename = '"
            + fullPathInJs + "', __dirname = '"
            + fullDirInJs + "', exports ={}, module =  { exports : exports, filename : __filename }; (function (exports, require, console, prompt) { "
            + script + "\n})(exports, puerts.genRequire('"
            + fullDirInJs + "'), puerts.console); return module.exports})()";
        return puerts.evalScript(executeScript, debugPath);
    }
    
    function genRequire(requiringDir) {
        let localModuleCache = Object.create(null);
        function require(moduleName) {
            moduleName = moduleName.startsWith('./') ? moduleName.substr(2) : moduleName;
            if (moduleName in localModuleCache) return localModuleCache[moduleName];
            if (moduleName in buildinModule) return buildinModule[moduleName];
            let {fullPath, debugPath, script} = loadModule(moduleName, requiringDir);
            let key = fullPath;
            if (key in moduleCache) {
                localModuleCache[moduleName] = moduleCache[key];
                return localModuleCache[moduleName];
            }
            let m
            if (fullPath.endsWith("package.json")) {
                let packageConfigure = JSON.parse(script);
                let fullDirInJs = (fullPath.indexOf('/') != -1) ? fullPath.substring(0, fullPath.lastIndexOf("/")) : fullPath.substring(0, fullPath.lastIndexOf("\\")).replace(/\\/g, '\\\\');
                let tmpRequire = genRequire(fullDirInJs);
                m = tmpRequire(packageConfigure.main);
            } else {
                m = executeModule(fullPath, script, debugPath);
            }
            localModuleCache[moduleName] = m;
            moduleCache[key] = m;
            return m;
        }

        return require;
    }
    
    function registerBuildinModule(name, module) {
        buildinModule[name] = module;
    }
    
    registerBuildinModule("puerts", puerts)

    puerts.genRequire = genRequire;
    
    puerts.registerBuildinModule = registerBuildinModule;
    
    global.require = genRequire("");
}(global));