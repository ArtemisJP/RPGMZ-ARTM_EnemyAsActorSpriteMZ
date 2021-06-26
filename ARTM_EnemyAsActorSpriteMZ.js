// ===================================================
// ARTM_EnemyAsActorSpriteMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ===================================================
// [Version]
// 1.0.0 初版
// 1.1.0 大規模なリファクタリングを実施
// 1.1.x アクタータイプ判定関連の不具合修正
// 1.2.0 NRP_DynamicMotionMZ競合対応(影更新)
// =================================================================
/*:ja
 * @target MZ
 * @plugindesc アクターを敵として出現させるMZ専用プラグイン
 * @author Artemis
 *
 * @help ARTM_EnemyAsActorSpriteMZ
 *
 * 【使い方】
 * １．MZツクールのデータベース「敵キャラ」画面でアクターベース
 *     となる敵を必要な人数分作成します。
 *     各ステータス、特性、報酬、行動パターン等はここで設定して下さい。
 *
 * ２．敵のメモ欄の任意行に 「<EAS_actorId:(アクターID)>」を記述します。
 *       ＜使用例＞ID0012のアクターを使用したい →「<EAS_actorId:12>」
 *     同じアクターでも必ず敵専用アクターIDで作成して下さい。
 *       ＜OK＞ID0002…味方専用プリシア、ID0012…敵専用プリシア
 *       ＜NG＞ID0002…味方用プリシア、ID0002…敵用プリシア
 *
 * ３．MZツクール画面のデータベース「敵グループ」画面で１．で作成した
 *     ベースの敵を配置します。
 *
 * ４．既存のイベントコマンドで作成した敵グループを指定して戦闘を開始します。
 *
 *---------------------------------------------
 * NRP_Dynamicシリーズと併用される場合の注意
 *---------------------------------------------
 * プラグイン管理画面にて本プラグインを必ずNRP_Dynamicシリーズより
 * “下”に置いて下さい。
 *
 *
 * プラグインコマンドはありません。
 *
 */

(() => {

    //-----------------------------------------------------------------------------
    // BattleManager
    //
    const _BattleManager_initMembers = BattleManager.initMembers;
    BattleManager.initMembers = function() {
        _BattleManager_initMembers.call(this);
        this._isTypeReversing = false;
    };

    const _BattleManager_updateEventMain = BattleManager.updateEventMain;
    BattleManager.updateEventMain = function() {
        $gameTroop.requestMotionRefresh();
        return _BattleManager_updateEventMain.call(this);
    };

    const _BattleManager_startTurn = BattleManager.startTurn;
    BattleManager.startTurn = function() {
         $gameTroop.requestMotionRefresh();
        _BattleManager_startTurn.call(this);
    };

    const _BattleManager_updateTurn = BattleManager.updateTurn;
    BattleManager.updateTurn = function(timeActive) {
         $gameTroop.requestMotionRefresh();
        _BattleManager_updateTurn.call(this, timeActive);
    };

    BattleManager.typeReversingOn = function() {
         this._isTypeReversing = true;
    };

    BattleManager.typeReversingOff = function() {
         this._isTypeReversing = false;
    };

    //-----------------------------------------------------------------------------
    // Scene_Battle
    //
    const _Scene_Battle_initialize = Scene_Battle.prototype.initialize;
    Scene_Battle.prototype.initialize = function() {
        _Scene_Battle_initialize.call(this);
        this._isTypeReversing = false;      
    };

    Game_Battler.prototype.asEnemy = function() {
        return this._asEnemy || false;
    };

    const _Game_Enemy_battlerName = Game_Enemy.prototype.battlerName;
    Game_Enemy.prototype.battlerName = function() {
        return(
            this.asEnemy() ?
            this._battlerName :
            _Game_Enemy_battlerName.call(this)
        );
    };

    //-----------------------------------------------------------------------------
    // Game_Action
    //
    const _Game_Action_setSubject = Game_Action.prototype.setSubject;
    Game_Action.prototype.setSubject = function(subject) {
        BattleManager.typeReversingOn();
        _Game_Action_setSubject.call(this, subject);
        BattleManager.typeReversingOff();
    };

    //-----------------------------------------------------------------------------
    // Game_Enemy
    //
    const _Game_Enemy_performActionStart = Game_Enemy.prototype.performActionStart;
    Game_Enemy.prototype.performActionStart = function(action) {
        _Game_Enemy_performActionStart.call(this, action);
    };

    const _Game_Enemy_performAction = Game_Enemy.prototype.performAction;
    Game_Enemy.prototype.performAction = function(action) {
        if (!this.asEnemy()) {
            _Game_Enemy_performAction.call(this, action);
            return;
        }
        Game_Battler.prototype.performAction.call(this, action);
        if (action.isAttack()) {
            this.performAttack();
        } else if (action.isGuard()) {
            this.requestMotion("guard");
        } else if (action.isMagicSkill()) {
            this.requestMotion("spell");
        } else if (action.isSkill()) {
            this.requestMotion("skill");
        } else if (action.isItem()) {
            this.requestMotion("item");
        }
    };

    const _Game_Enemy_performActionEnd = Game_Enemy.prototype.performActionEnd;
    Game_Enemy.prototype.performActionEnd = function() {
        if (!this.asEnemy()) {
            _Game_Enemy_performActionEnd.call(this);
            return;
        }

    };

    const _Game_Enemy_performAttack = Game_Enemy.prototype.performAttack;
    Game_Enemy.prototype.performAttack = function() {
        if (!this.asEnemy()) {
            _Game_Enemy_performAttack.call(this);
            return;
        }
        const weapons = this.weapons();
        const wtypeId = weapons[0] ? weapons[0].wtypeId : 0;
        const attackMotion = $dataSystem.attackMotions[wtypeId];
        if (attackMotion) {
            if (attackMotion.type === 0) {
                this.requestMotion("thrust");
            } else if (attackMotion.type === 1) {
                this.requestMotion("swing");
            } else if (attackMotion.type === 2) {
                this.requestMotion("missile");
            }
            this.startWeaponAnimation(attackMotion.weaponImageId);
        }
    };

    //-----------------------------------------------------------------------------
    // Game_Troop
    //
    Game_Troop.prototype.setup = function(troopId) {
        // Overridable
        this.clear();
        this._troopId = troopId;
        this._enemies = [];
        for (const member of this.troop().members) {
            if ($dataEnemies[member.enemyId]) {
                this.setupProc(member);
            }
        }
        this.makeUniqueNames();
    };

    Game_Troop.prototype.setupProc = function(member) {
        const enemyId = member.enemyId;
        const x = member.x;
        const y = member.y;
        const _enemy = new Game_Enemy(enemyId, x, y);
        const enm_actorId = _enemy.enemy().meta["EAS_actorId"];
        let enemy;
        if (enm_actorId) {
            enemy = new Game_EnemyImgAct(enm_actorId, enemyId, x, y);
            if (member.hidden) enemy.hide();
            enemy._asEnemy = true;
            this._enemies.push(enemy);
            return;
        } else {
            enemy = _enemy;
        }
        if (member.hidden) enemy.hide();
        this._enemies.push(enemy);
    };

    Game_Troop.prototype.requestMotionRefresh = function() {
        for (const enemy of this.members()) {
            if (enemy.isEnemy()) continue;
            enemy.requestMotionRefresh();
        }
    };

    //-----------------------------------------------------------------------------
    // Game_EnemyImgAct
    //
    function Game_EnemyImgAct(actorId, enemyId, x, y) {
        Game_Actor.prototype.initialize.call(this, actorId);
        Object.assign(this, Game_Enemy.prototype);
        Game_Enemy.prototype.initialize.call(this, enemyId, x, y);
        this.initializeEx();
    }

    Game_EnemyImgAct.prototype = Object.create(Game_Actor.prototype);
    Game_EnemyImgAct.prototype.constructor = Game_EnemyImgAct;

    Game_EnemyImgAct.prototype.initializeEx = function() {
        this.x = this.screenX();
        this.y = this.screenY();
    };

    Game_EnemyImgAct.prototype.canInput = function() {
        return false;
    };

    Game_EnemyImgAct.prototype.isActor = function() {
        return !BattleManager._isTypeReversing;
    };

    //-----------------------------------------------------------------------------
    // Sprite
    //
    Sprite.prototype.updateDirectionEAS = function() {
        if (Math.sign(this.scale.x) != -1) {
            this.scale.x = -1;
        }
    }

    //-----------------------------------------------------------------------------
    // Sprite_Actor
    //
    const _Sprite_Actor_setActorHome = Sprite_Actor.prototype.setActorHome;
    Sprite_Actor.prototype.setActorHome = function(index) {
        const actor = this._actor;
        if (actor.asEnemy()) {
            this.setHome(actor.x, actor.y);
            return;
        }
        _Sprite_Actor_setActorHome.call(this, index);
    };

    const _Sprite_Actor_stepForward = Sprite_Actor.prototype.stepForward;
    Sprite_Actor.prototype.stepForward = function() {
        if (this._actor.asEnemy()) {
            this.startMove(48, 0, 12);
            return;
        }
        _Sprite_Actor_stepForward.call(this);
    };

    const _Sprite_Actor_startEntryMotion = Sprite_Actor.prototype.startEntryMotion;
    Sprite_Actor.prototype.startEntryMotion = function() {
        _Sprite_Actor_startEntryMotion.call(this);
        if (!this._actor) return;
        if (this._actor.isHidden() && this.opacity != 0) {
            this.opacity = 0;
        }
    }

    const _Sprite_Actor_update = Sprite_Actor.prototype.update;
    Sprite_Actor.prototype.update = function() {
        _Sprite_Actor_update.call(this);
        const actor = this._actor;
        if (actor && actor.asEnemy()) {
            this.updateEffect();
            this.updateStateSprite();
            this.updateDirectionEAS();
        }
    }

    // *Patch for NRP_DynamicMotionMZ
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

    const _Sprite_Actor_retreat = Sprite_Actor.prototype.retreat;
    Sprite_Actor.prototype.retreat = function() {
        if (this._actor.asEnemy()) return;
        _Sprite_Actor_retreat.call(this);
    }

    const _Sprite_Actor_damageOffsetX = Sprite_Actor.prototype.damageOffsetX;
    Sprite_Actor.prototype.damageOffsetX = function() {
        if (this._actor.asEnemy()) {
            return Sprite_Battler.prototype.damageOffsetX.call(this) + 32;        
        }
        return _Sprite_Actor_damageOffsetX.call(this);
    };

    //-----------------------------------------------------------------------------
    // Sprite_EnemyImgAct
    //
    function Sprite_EnemyImgAct(battler) {
        Sprite_Enemy.prototype.initialize.call(this, battler);
        Object.assign(this, Sprite_Actor.prototype);
        Sprite_Battler.prototype.initialize.call(this, battler);
        this.initializeEx(battler);
    }

    Sprite_EnemyImgAct.prototype = Object.create(Sprite_Enemy.prototype);
    Sprite_EnemyImgAct.prototype.constructor = Sprite_EnemyImgAct;

    Sprite_EnemyImgAct.prototype.initializeEx = function(battler) {
        battler._actionState = "undecided";
        this.createStateIconSprite(battler);
        this.updateDirectionEAS();
        this._shadowSprite.scale.x = -1;
    };

    Sprite_EnemyImgAct.prototype.createStateIconSprite = function(battler) {
        this._stateIconSprite = new Sprite_StateIcon();
        this._stateIconSprite.setup(battler);
        this.addChild(this._stateIconSprite);
    };

    Sprite_EnemyImgAct.prototype.updateStateSprite = function() {
        if (this._actor.asEnemy()) {
            const sprite = this._mainSprite;
            const height = sprite.height;
            this._stateIconSprite.y = -Math.round((height + 40) * 0.9);
            if (this._stateIconSprite.y < 20 - this.y) {
                this._stateIconSprite.y = 20 - this.y;
            }
        } else {
            Sprite_Enemy.prototype.updateStateSprite.call(this);
        }
    };

    //-----------------------------------------------------------------------------
    // Sprite_StateIcon
    //
    const _Sprite_StateIcon_setup = Sprite_StateIcon.prototype.setup;
    Sprite_StateIcon.prototype.setup = function(battler) {
        _Sprite_StateIcon_setup.call(this, battler);
        if (battler && battler.isActor() && battler.asEnemy()) {
            this.updateDirectionEAS();
        }

    };

    const _Sprite_StateIcon_shouldDisplay = Sprite_StateIcon.prototype.shouldDisplay;
    Sprite_StateIcon.prototype.shouldDisplay = function() {
        BattleManager.typeReversingOn();
        const ret = _Sprite_StateIcon_shouldDisplay.call(this);
        BattleManager.typeReversingOff();
        return ret;
    };

    //-----------------------------------------------------------------------------
    // Sprite_StateOverlay
    //
    const _Sprite_StateOverlay_setup = Sprite_StateOverlay.prototype.setup;
    Sprite_StateOverlay.prototype.setup = function(battler) {
        if (battler && battler.isActor() && battler.asEnemy()) {
            // Disable Sprite_StateOverlay
            return;
            this.updateDirectionEAS();
        }
        _Sprite_StateOverlay_setup.call(this, battler);
    };

    //-----------------------------------------------------------------------------
    // Spriteset_Battle
    //
    Spriteset_Battle.prototype.createEnemies = function() {
        // Overridable
        const enemies = $gameTroop.members();
        const sprites = [];
        for (const enemy of enemies) {
            if (enemy.isActor()) {
                sprites.push(new Sprite_EnemyImgAct(enemy));
            } else {
                sprites.push(new Sprite_Enemy(enemy));
            }
        }
        sprites.sort(this.compareEnemySprite.bind(this));
        for (const sprite of sprites) {
            this._battleField.addChild(sprite);
        }
        this._enemySprites = sprites;
    };

    Spriteset_Battle.prototype.createAnimationSprite = function(targets, animation, mirror, delay) {
        if (targets[0].isActor()) {
            if (targets[0].asEnemy()) {
                animation.rotation.y = 180;
            } else {
                animation.rotation.y = 0;
            }
        }
        Spriteset_Base.prototype.createAnimationSprite.call(this, targets, animation, mirror, delay);
    };

    //-----------------------------------------------------------------------------
    // Window_BattleLog
    //
    const _Window_BattleLog_makeHpDamageText = Window_BattleLog.prototype.makeHpDamageText;
    Window_BattleLog.prototype.makeHpDamageText = function(target) {
        BattleManager.typeReversingOn();
        const result = _Window_BattleLog_makeHpDamageText.call(this, target);
        BattleManager.typeReversingOff();
        return result;
    };

    const _Window_BattleLog_makeMpDamageText = Window_BattleLog.prototype.makeMpDamageText;
    Window_BattleLog.prototype.makeMpDamageText = function(target) {
        BattleManager.typeReversingOn();
        const result =  _Window_BattleLog_makeMpDamageText.call(this, target);
        BattleManager.typeReversingOff();
        return result;
    };

    const _Window_BattleLog_makeTpDamageText = Window_BattleLog.prototype.makeTpDamageText;
    Window_BattleLog.prototype.makeTpDamageText = function(target) {
        BattleManager.typeReversingOn();
        const result =  _Window_BattleLog_makeTpDamageText.call(this, target);
        BattleManager.typeReversingOff();
        return result;
    };

})();