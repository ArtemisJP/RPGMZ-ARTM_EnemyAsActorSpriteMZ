// ===================================================
// ARTM_EnemyAsActorSpriteMZ_TMZEHBPatch
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
 * TorigoyaMZ_EnemyHpBar競合パッチ
 * @author Artemis
 *
 * @help ARTM_EnemyAsActorSpriteMZ_TMZEHBPatch
 *
 * TorigoyaMZ_EnemyHpBar競合パッチです。
 * 拙作「ARTM_EnemyAsActorSpriteMZ」が既に導入されている必要があります。
 *
 *
 * パラメータ設定、プラグインコマンドはありません。
 *
 */

(() => {

    //-----------------------------------------------------------------------------
    // *Patch for TorigoyaMZ_EnemyHpBar
    //
    const _Sprite_Actor_update = Sprite_Actor.prototype.update;
    Sprite_Actor.prototype.update = function() {
        _Sprite_Actor_update.call(this);
        const actor = this._actor;
        if (actor && actor.asEnemy()) {
            this.torigoyaEnemyHpBar_updateGaugeSprite();
            this._torigoyaEnemyHpBar_gaugeSprite.y = -this.height;
        }
    }

    const _Sprite_Battler_initialize = Sprite_Battler.prototype.initialize;
    Sprite_Battler.prototype.initialize = function(battler) {
        _Sprite_Battler_initialize.call(this, battler);
        if (!(battler && battler.asEnemy())) { return; }
        this._torigoyaEnemyHpBar_gaugeSprite = new Torigoya.EnemyHpBar.Sprite_EnemyHpGauge();
        this._torigoyaEnemyHpBar_gaugeSprite.anchor.y = 1;
        this._torigoyaEnemyHpBar_gaugeSprite.anchor.x = 0.5;
        this._torigoyaEnemyHpBar_gaugeSprite.opacity = 0;
        this._torigoyaEnemyHpBar_gaugeSprite.setup(battler, 'hp');
        this._torigoyaEnemyHpBar_gaugeSprite.scale.x = -1;
        this.addChild(this._torigoyaEnemyHpBar_gaugeSprite);
    };

})();