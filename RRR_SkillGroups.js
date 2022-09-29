/*
 * @plugindesc Organize skills into groups that can be interacted with via the
 * actor command window.
 *
 * @author raymadeit
 *
 * @help
 *
 * Skill Groups
 * Version 1.1
 * raymadeit
 *
 * =============================================================================
 *  Skill Notetags
 * =============================================================================
 *
 * The following notetags can be used to customize the setup:
 *
 *
 *   <Group [Group Name]: [Skill Type ID1], [Skill Type ID2], ...>
 *
 * Using this notetag, a list of skill types will be grouped under [Group Name].
 * For example: <Group Paladin: 3, 4>
 *
 *
 *   <Command Order: [command1], [command2], ...>
 *
 * Using this notetag to organize the actor command window. You can include
 * group names in this order. For example: <Command Order: Attack, Item, Guard,
 * Paladin>
 *
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
 * If you have questions, or if you enjoyed this Plugin, please check
 * out my requests page!
 *
 * https://www.reddit.com/r/theideaguy
 *
 *
 * Until next time,
 *   ~ Raymadeit
 *
 */

const RRR = RRR || {};
RRR.SkillGroups = RRR.SkillGroups || {};
RRR.NotetagGetters = RRR.NotetagGetters || [];

(function (_) {
  'use strict';

  // ---------------------------------------------------------------------------
  // RRR.SkillGroups
  // ---------------------------------------------------------------------------

  _.loadNotetags = function () {
    const data = $dataActors;
    const regex1 = /<Command[ ]?Order[ ]?:[ ]?(.*)>/im;
    const regex2 = /<Group[ ]?(.*)[ ]?:[ ]?(.*)>/gim;
    for (let i = 1; i < data.length; i++) {
      const note = data[i].note;
      data[i]._se_commandOrder = (note.match(regex1) || [])[1] || '';
      data[i]._se_groupedSkills = {};
      let entry;
      while ((entry = regex2.exec(note))) {
        const groupedSkillName = entry[1].toLowerCase();
        const childSkills = entry[2];
        data[i]._se_groupedSkills[groupedSkillName] = childSkills;
      }
    }
  };

  RRR.NotetagGetters.push(_.loadNotetags);

  // ---------------------------------------------------------------------------
  // DataManager
  // ---------------------------------------------------------------------------

  if (!RRR.DataManager_isDatabaseLoaded) {
    RRR.notetagsLoaded = false;
    RRR.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function () {
      if (!RRR.DataManager_isDatabaseLoaded.apply(this, arguments)) {
        return false;
      }
      if (!RRR.notetagsLoaded) {
        RRR.NotetagGetters.forEach(function (func) {
          func.call(this);
        }, this);
        RRR.notetagsLoaded = true;
      }
      return true;
    };
  }

  // ---------------------------------------------------------------------------
  // Window_Command
  // ---------------------------------------------------------------------------
  Window_Command.prototype.removeCommand = function (index) {
    this._list = this._list.filter((_, i) => i != index);
  };

  // ---------------------------------------------------------------------------
  // Window_ActorCommand
  // ---------------------------------------------------------------------------

  Window_ActorCommand.prototype.clearBasicCommands = function () {
    const symbolsToDelete = ['attack', 'guard', 'item', 'skill', 'group'];
    symbolsToDelete.forEach((symbol) => {
      while (this.findSymbol(symbol) > -1) {
        const indexOfCommand = this.findSymbol(symbol);
        if (indexOfCommand > -1) {
          this.removeCommand(indexOfCommand);
        }
      }
    });
  };

  Window_ActorCommand.prototype.getCommand = function (index) {
    return this._list[index];
  };

  Window_ActorCommand.prototype.getAllCommands = function () {
    const commands = [];
    for (let i = 0; i < this.maxItems(); i++) {
      commands.push(this.getCommand(i));
    }
    return commands;
  };

  _.Window_ActorCommand_makeCommandList =
    Window_ActorCommand.prototype.makeCommandList;
  Window_ActorCommand.prototype.makeCommandList = function () {
    _.Window_ActorCommand_makeCommandList.apply(this, arguments);

    if (!this._actor) {
      return;
    }

    const actorData = $dataActors[this._actor.actorId()];
    if (actorData._se_commandOrder) {
      this.clearBasicCommands();
      const extraCommands = this.getAllCommands();
      this.clearCommandList();

      const order = actorData._se_commandOrder.split(/,[\s]?/);
      const skillTypes = this._actor.addedSkillTypes();
      const skillNames = [];
      const skillNamesToType = {};
      for (let k = 0; k < skillTypes.length; k++) {
        const skillName = $dataSystem.skillTypes[skillTypes[k]].toLowerCase();
        skillNames.push(skillName);
        skillNamesToType[skillName] = skillTypes[k];
      }

      const skillGroups = Object.keys(actorData._se_groupedSkills);

      for (let i = 0; i < order.length; i++) {
        const commandName = order[i].toLowerCase();
        if (commandName == 'attack') {
          this.addAttackCommand();
        } else if (commandName == 'guard') {
          this.addGuardCommand();
        } else if (commandName == 'item') {
          this.addItemCommand();
        } else if (skillNames.contains(commandName)) {
          const displayName =
            commandName.charAt(0).toUpperCase() + commandName.slice(1);
          this.addCommand(
            displayName,
            'skill',
            /* enabled= */ true,
            skillNamesToType[commandName]
          );
        } else if (skillGroups.contains(commandName)) {
          const displayName =
            commandName.charAt(0).toUpperCase() + commandName.slice(1);
          const childSkills = actorData._se_groupedSkills[commandName]
            .split(/,[\s]?/)
            .map(function (sType) {
              return parseInt(sType);
            });
          this.addCommand(
            displayName,
            'group',
            /* enabled= */ true,
            childSkills
          );
        }
      }

      extraCommands.forEach((command) => {
        this.addCommand(
          command.name,
          command.symbol,
          command.enabled,
          command.ext
        );
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Scene_Battle
  // ---------------------------------------------------------------------------

  _.Scene_Battle_createActorCommandWindow =
    Scene_Battle.prototype.createActorCommandWindow;
  Scene_Battle.prototype.createActorCommandWindow = function () {
    _.Scene_Battle_createActorCommandWindow.apply(this, arguments);
    this._actorCommandWindow.setHandler('group', this.commandGroup.bind(this));
  };

  Scene_Battle.prototype.commandGroup = function () {
    this._skillWindow.setActor(BattleManager.actor());
    this._skillWindow.setChildSkills(this._actorCommandWindow.currentExt());
    this._skillWindow.setStypeId(0);
    this._skillWindow.refresh();
    this._skillWindow.show();
    this._skillWindow.activate();
  };

  _.Scene_Battle_commandSkill = Scene_Battle.prototype.commandSkill;
  Scene_Battle.prototype.commandSkill = function () {
    this._skillWindow.setChildSkills([]);
    _.Scene_Battle_commandSkill.apply(this, arguments);
  };

  // ---------------------------------------------------------------------------
  // Window_SkillList
  // ---------------------------------------------------------------------------

  _.Window_SkillList_initialize = Window_SkillList.prototype.initialize;
  Window_SkillList.prototype.initialize = function (x, y, width, height) {
    _.Window_SkillList_initialize.apply(this, arguments);
    this._childSkillIds = [];
  };

  _.Window_SkillList_includes = Window_SkillList.prototype.includes;
  Window_SkillList.prototype.includes = function (item) {
    return (
      _.Window_SkillList_includes.apply(this, arguments) ||
      this._childSkillIds.includes(item.stypeId)
    );
  };

  Window_SkillList.prototype.setChildSkills = function (childSkills) {
    this._childSkillIds = childSkills;
    this.refresh();
    this.resetScroll();
  };
})(RRR.SkillGroups);
