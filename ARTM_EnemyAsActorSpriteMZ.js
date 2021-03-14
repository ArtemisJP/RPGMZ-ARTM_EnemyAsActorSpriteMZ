// ===================================================
// ARTM_EnemyAsActorSpriteMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ===================================================
// [Version]
// 1.0.0 初版
// =============================================================
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
 * プラグインコマンドはありません。
 */

(() => {

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

    const _Scene_Battle_initialize = Scene_Battle.prototype.initialize;
    Scene_Battle.prototype.initialize = function() {
        _Scene_Battle_initialize.call(this);
        this._isTypeReversing = false;      
    };

    const _Game_Actor_setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = function(actorId) {
        _Game_Actor_setup.call(this, actorId);
        this._asEnemy = false;
        this._enemyId = 0;
        this._letter = "";
        this._plural = false;
    };

    Game_Actor.prototype.isAutoBattle = function() {
        if (this.asEnemy()) {
            return true;
        } else {
            return Game_BattlerBase.prototype.isAutoBattle.call(this);
        }
    };


    Game_Actor.prototype.asEnemy = function() {
        return this._asEnemy;
    };

    const _Game_Actor_friendsUnit = Game_Actor.prototype.friendsUnit;
    Game_Actor.prototype.friendsUnit = function() {
        if (this.asEnemy()) {
            return $gameTroop;
        } else {
            return _Game_Actor_friendsUnit.call(this);
        }
    };

    const _Game_Actor_isActor = Game_Actor.prototype.isActor;
    Game_Actor.prototype.isActor = function() {
        if (BattleManager._isTypeReversing) {
            return !this.asEnemy();
        } else {
            return _Game_Actor_isActor.call(this);
        }
    };

    const _Game_Actor_opponentsUnit = Game_Actor.prototype.opponentsUnit;
    Game_Actor.prototype.opponentsUnit = function() {
        if (this.asEnemy()) {
            return $gameParty;
        } else {
            return _Game_Actor_opponentsUnit.call(this);
        }
    };

    const _Game_Actor_index = Game_Actor.prototype.index;
    Game_Actor.prototype.index = function() {
        if (this.asEnemy()) {
            return $gameTroop.members().indexOf(this);
        } else {
            return _Game_Actor_index.call(this);
        }
    };

    const _Game_Actor_isBattleMember = Game_Actor.prototype.isBattleMember;
    Game_Actor.prototype.isBattleMember = function() {
        if (this.asEnemy()) {
            return true;
        } else {
            return _Game_Actor_isBattleMember.call(this);
        }
    };

    const _Game_Actor_paramBase = Game_Actor.prototype.paramBase;
    Game_Actor.prototype.paramBase = function(paramId) {
        if (this.asEnemy()) {
            return this.enemy().params[paramId];
        } else {
            return _Game_Actor_paramBase.call(this, paramId);
        }
    };

    const _Game_Actor_traitObjects = Game_Actor.prototype.traitObjects;
    Game_Actor.prototype.traitObjects = function() {
        const traitObjects = _Game_Actor_traitObjects.call(this)
        if (this.asEnemy()) {
            return traitObjects.concat(this.enemy());
        } else {
            return traitObjects;
        }
    };

//=========================== Substitution [Start] ===========================
    Game_Actor.prototype.selectAction = function(actionList, ratingZero) {
        const sum = actionList.reduce((r, a) => r + a.rating - ratingZero, 0);
        if (sum > 0) {
            let value = Math.randomInt(sum);
            for (const action of actionList) {
                value -= action.rating - ratingZero;
                if (value < 0) {
                    return action;
                }
            }
        } else {
            return null;
        }
    };

    Game_Actor.prototype.selectAllActions = function(actionList) {
        const ratingMax = Math.max(...actionList.map(a => a.rating));
        const ratingZero = ratingMax - 3;
        actionList = actionList.filter(a => a.rating > ratingZero);
        for (let i = 0; i < this.numActions(); i++) {
            this.action(i).setEnemyAction(
                this.selectAction(actionList, ratingZero)
            );
        }
    };

    const _Game_Actor_makeActions = Game_Actor.prototype.makeActions;
    Game_Actor.prototype.makeActions = function() {
        if (!this.asEnemy()) {
            _Game_Actor_makeActions.call(this);
            return;
        }
       Game_Battler.prototype.makeActions.call(this);
       if (this.numActions() > 0) {
           const actionList = this.enemy().actions.filter(a =>
               this.isActionValid(a)
           );
           if (actionList.length > 0) {
               this.selectAllActions(actionList);
           }
       }
       this.setActionState("waiting");
    };

    Game_Actor.prototype.isActionValid = function(action) {
        return (
            this.meetsCondition(action) && this.canUse($dataSkills[action.skillId])
        );
    };

    Game_Actor.prototype.meetsCondition = function(action) {
        const param1 = action.conditionParam1;
        const param2 = action.conditionParam2;
        switch (action.conditionType) {
            case 1:
                return this.meetsTurnCondition(param1, param2);
            case 2:
                return this.meetsHpCondition(param1, param2);
            case 3:
                return this.meetsMpCondition(param1, param2);
            case 4:
                return this.meetsStateCondition(param1);
            case 5:
                return this.meetsPartyLevelCondition(param1);
            case 6:
                return this.meetsSwitchCondition(param1);
            default:
                return true;
        }
    };

    Game_Actor.prototype.meetsTurnCondition = function(param1, param2) {
        const n = this.turnCount();
        if (param2 === 0) {
            return n === param1;
        } else {
            return n > 0 && n >= param1 && n % param2 === param1 % param2;
        }
    };

    Game_Actor.prototype.meetsHpCondition = function(param1, param2) {
        return this.hpRate() >= param1 && this.hpRate() <= param2;
    };

    Game_Actor.prototype.meetsMpCondition = function(param1, param2) {
        return this.mpRate() >= param1 && this.mpRate() <= param2;
    };

    Game_Actor.prototype.meetsStateCondition = function(param) {
        return this.isStateAffected(param);
    };

    Game_Actor.prototype.meetsPartyLevelCondition = function(param) {
        return $gameParty.highestLevel() >= param;
    };

    Game_Actor.prototype.meetsSwitchCondition = function(param) {
        return $gameSwitches.value(param);
    };

    Game_Actor.prototype.enemy = function() {
        return $dataEnemies[this._enemyId];
    };

    Game_Actor.prototype.exp = function() {
        return this.enemy().exp;
    };

    Game_Actor.prototype.gold = function() {
        return this.enemy().gold;
    };

    Game_Actor.prototype.makeDropItems = function() {
        const rate = this.dropItemRate();
        return this.enemy().dropItems.reduce((r, di) => {
            if (di.kind > 0 && Math.random() * di.denominator < rate) {
                return r.concat(this.itemObject(di.kind, di.dataId));
            } else {
                return r;
            }
        }, []);
    };

    Game_Actor.prototype.dropItemRate = function() {
        return $gameParty.hasDropItemDouble() ? 2 : 1;
    };

    Game_Actor.prototype.itemObject = function(kind, dataId) {
        if (kind === 1) {
            return $dataItems[dataId];
        } else if (kind === 2) {
            return $dataWeapons[dataId];
        } else if (kind === 3) {
            return $dataArmors[dataId];
        } else {
            return null;
        }
    };

    Game_Actor.prototype.originalName = function() {
        return this.actor().name;
    };

    Game_Actor.prototype.name = function() {
        return this.originalName() + (this._plural ? this._letter : "");
    };

    Game_Actor.prototype.isLetterEmpty = function() {
        return this._letter === "";
    };

    Game_Actor.prototype.setLetter = function(letter) {
        this._letter = letter;
    };

    Game_Actor.prototype.setPlural = function(plural) {
        this._plural = plural;
    };
//=========================== Substitution [End] ===========================

    Game_Enemy.prototype.asEnemy = function() {
        return false;
    };

    const _Game_Action_setSubject = Game_Action.prototype.setSubject;
    Game_Action.prototype.setSubject = function(subject) {
        _Game_Action_setSubject.call(this, subject);
        if (subject.asEnemy()) {
            this._subjectEnemyIndex = subject.index();
        }
    };

    const _Game_Action_subject = Game_Action.prototype.subject;
    Game_Action.prototype.subject = function() {
        const subjectId = this._subjectActorId;
        const isValidId = subjectId > 0;
        if (isValidId && $gameActors.actor(subjectId).asEnemy()) {
            return $gameTroop.members()[this._subjectEnemyIndex];
        }
        return _Game_Action_subject.call(this);
    };

    // overrides
    Game_Troop.prototype.setup = function(troopId) {
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
        const enemy = new Game_Enemy(enemyId, x, y);
        const enm_actorId = enemy.enemy().meta["EAS_actorId"];
        if (enm_actorId) {
            const actor = new Game_Actor(enm_actorId);
            if (member.hidden) actor.hide();
            actor.x = enemy.screenX();
            actor.y = enemy.screenY();
            actor._asEnemy = true;
            actor._enemyId = enemyId;
            $gameActors._data[enm_actorId] = actor;
            this._enemies.push(actor);
            return;
        } else {
            if (member.hidden) enemy.hide();
            this._enemies.push(enemy);
        }
    };

    Game_Troop.prototype.requestMotionRefresh = function() {
        for (const enemy of this.members()) {
            if (enemy.isEnemy()) continue;
            enemy.requestMotionRefresh();
        }
    };

    const _Sprite_Actor_initialize = Sprite_Actor.prototype.initialize;
    Sprite_Actor.prototype.initialize = function(battler) {
        if (battler && battler.asEnemy()) {
            Sprite_Battler.prototype.initialize.call(this, battler);
            battler._actionState = "undecided";
            this.scale = new PIXI.Point(-1,1);
            return;
        }
        _Sprite_Actor_initialize.call(this, battler);
        this._effectDuration = 0;
    };

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
        this.updateAppear();
    }

    Sprite_Actor.prototype.updateAppear = function() {
        if (!this._actor) return;
        if (!this._actor.isHidden() && this.opacity === 0) {
            this._actor.appear();
            this.opacity = 255;
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

    const _Sprite_StateOverlay_setup = Sprite_StateOverlay.prototype.setup;
    Sprite_StateOverlay.prototype.setup = function(battler) {
        _Sprite_StateOverlay_setup.call(this, battler);
        if (battler.isActor() && battler.asEnemy()) {
            this.scale = new PIXI.Point(-1,1);
        }
    };

    // overrides
    Spriteset_Battle.prototype.createEnemies = function() {
        const enemies = $gameTroop.members();
        const sprites = [];
        for (const enemy of enemies) {
            if (enemy.isActor()) {
                sprites.push(new Sprite_Actor(enemy));
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