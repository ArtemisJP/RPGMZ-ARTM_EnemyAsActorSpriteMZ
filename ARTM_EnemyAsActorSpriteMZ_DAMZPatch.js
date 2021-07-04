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
 * 砂川赳様作「NRP_DynamicMotionMZ」との併用導入パッチ
 * @author Artemis
 *
 * @help ARTM_EnemyAsActorSpriteMZ_DAMZPatch
 *
 * 「ARTM_EnemyAsActorSpriteMZ」と、
 * 砂川赳様作「NRP_DynamicMotionMZ」を併用する際のパッチです。
 *
 *
 * パラメータ設定、プラグインコマンドはありません。
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