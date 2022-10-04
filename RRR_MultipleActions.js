/*
 * @plugindesc Allows actors to perform actions instantly. Once an actor
 * executes an action, they can continue to use actions and skills until the
 * actor presses the "pass" menu command.
 *
 * @author raymadeit
 *
 * @help
 *
 * Multiple Actions
 * Version 1.0
 * raymadeit
 *
 * =============================================================================
 *  End of Help File
 * =============================================================================
 *
 * Welcome to the bottom of the Help file.
 *
 *
 * Thanks for reading!
 *
 * If you have questions, or if you enjoyed this plugin, please check
 * out my requests page!
 *
 * https://www.reddit.com/r/theideaguy
 *
 *
 * Until next time,
 *   ~ Raymadeit
 *
 */

var RRR = RRR || {};
RRR.MultipleActions = RRR.MultipleActions || {};
RRR.NotetagGetters = RRR.NotetagGetters || [];

(function (_) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Window_ActorCommand
  // ---------------------------------------------------------------------------
  _.Window_ActorCommand_makeCommandList =
    Window_ActorCommand.prototype.makeCommandList;
  Window_ActorCommand.prototype.makeCommandList = function () {
    _.Window_ActorCommand_makeCommandList.apply(this, arguments);
    this.addCommand('Pass', 'pass', /* enabled= */ true);
  };

  // ---------------------------------------------------------------------------
  // Scene_Battle
  // ---------------------------------------------------------------------------
  _.Scene_Battle_createActorCommandWindow =
    Scene_Battle.prototype.createActorCommandWindow;
  Scene_Battle.prototype.createActorCommandWindow = function () {
    _.Scene_Battle_createActorCommandWindow.apply(this, arguments);
    this._actorCommandWindow.setHandler('pass', this.commandPass.bind(this));
  };

  Scene_Battle.prototype.commandPass = function () {
    BattleManager.passCurrentActor();
    this.selectNextCommand();
  };

  //----------------------------------------------------------------------------
  // BattleManager
  //----------------------------------------------------------------------------
  _.BattleManager_initMembers = BattleManager.initMembers;
  BattleManager.initMembers = function () {
    _.BattleManager_initMembers(this, arguments);
    this._gameBattlerIndex = -1;
  };

  _.BattleManager_makeActionOrders = BattleManager.makeActionOrders;
  BattleManager.makeActionOrders = function () {
    _.BattleManager_makeActionOrders(this, arguments);

    var battlers = [];
    if (this._gameBattlerIndex < $gameParty.size() && !this._surprise) {
      battlers.push($gameParty.members()[this._gameBattlerIndex]);
    } else {
      battlers = battlers.concat($gameTroop.members());
      battlers.forEach(function (battler) {
        battler.makeSpeed();
      });
      battlers.sort(function (a, b) {
        return b.speed() - a.speed();
      });
    }
    this._actionBattlers = battlers;
  };

  BattleManager.selectNextCommand = function () {
    do {
      if (!this.actor() || !this.actor().selectNextCommand()) {
        if (this._gameBattlerIndex < 0) {
          this._gameBattlerIndex++;
          this.changeActor(this._gameBattlerIndex, 'waiting');
        } else {
          this.startTurn();
          break;
        }
      }
    } while (!this.actor().canInput());
  };

  BattleManager.selectPreviousCommand = function () {
    do {
      if (!this.actor() || !this.actor().selectPreviousCommand()) {
        this._gameBattlerIndex--;
        this.changeActor(this._gameBattlerIndex, 'undecided');
        if (this._actorIndex < 0) {
          return;
        }
      }
    } while (!this.actor().canInput());
  };

  BattleManager.passCurrentActor = function () {
    this._gameBattlerIndex++;
    if (this.actor()) {
      this.actor().clearActions();
      this.actor().setActionState('waiting');
    }
  };

  BattleManager.actorsAreBattling = function () {
    return (
      this._gameBattlerIndex >= 0 && this._gameBattlerIndex < $gameParty.size()
    );
  };

  BattleManager.allBattleMembers = function () {
    if (this._gameBattlerIndex < 0) {
      return [];
    } else if (this._gameBattlerIndex < $gameParty.size()) {
      return [$gameParty.members()[this._gameBattlerIndex]];
    } else {
      return $gameTroop.members();
    }
  };

  BattleManager.startInput = function () {
    this._phase = 'input';
    $gameParty.makeActions();
    $gameTroop.makeActions();
    if (this.actorsAreBattling()) {
      this._actorIndex = this._gameBattlerIndex;
    } else {
      this.clearActor();
      this._gameBattlerIndex = -1;
    }
    if (this._surprise || !$gameParty.canInput()) {
      this.startTurn();
    }
  };
})(RRR.MultipleActions);
