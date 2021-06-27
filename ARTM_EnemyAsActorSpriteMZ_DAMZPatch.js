// ===================================================
// ARTM_EnemyAsActorSpriteMZ_DAMZPatch
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ===================================================
// [Version]
// 1.0.0 初版
// =================================================================
/*:ja
 * @target MZ
 * @plugindesc アクターを敵として出現させるMZ専用プラグイン
 * NRP_DynamicMotionMZ競合パッチ
 * @author Artemis
 *
 * @help ARTM_EnemyAsActorSpriteMZ_DAMZPatch
 *
 * 【使い方】
 * 本プラグインを導入するだけです。
 * 拙作「ARTM_EnemyAsActorSpriteMZ」が既に導入されている必要があります。
 * プラグイン管理画面にて本プラグインを必ずARTM_EnemyAsActorSpriteMZの
 * “下”に置いて下さい。
 *
 *
 * プラグインコマンドはありません。
 *
 */

(() => {

    //-----------------------------------------------------------------------------
    // function
    //
    function toggleTypeProc(object, method, args, isRet = false) {
        BattleManager.typeReversingOn();
        if (!isRet) { 
            method.call(object, ...args);
            BattleManager.typeReversingOff();
        } else {
            const result = method.call(object, ...args);
            BattleManager.typeReversingOff();
            return result;
        }
    }

    //-----------------------------------------------------------------------------
    // *Patch for NRP_DynamicMotionMZ
    //
    const _DynamicMotion_initialize = DynamicMotion.prototype.initialize;
    DynamicMotion.prototype.initialize = function (baseMotion, performer, target, r) {
        toggleTypeProc(this, _DynamicMotion_initialize, arguments);
    }

    const _Sprite_Actor_updateDynamicShadow = Sprite_Actor.prototype.updateDynamicShadow;
    Sprite_Actor.prototype.updateDynamicShadow = function() {
        const asEnemy = this._actor && this._actor.asEnemy();
        const mirror = this._setDynamicMotion._mirror;
        if (asEnemy) {
            this._setDynamicMotion._mirror = !mirror;
        }
        _Sprite_Actor_updateDynamicShadow.call(this);
        if (asEnemy) {
            this._setDynamicMotion._mirror = mirror;
        }
    };

})();