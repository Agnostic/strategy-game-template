var game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.CANVAS, 'game', {
  preload: preload,
  create: create,
  update: update,
  render: render
});

function preload() {
  game.load.tilemap('desert', 'assets/desert.json', null, Phaser.Tilemap.TILED_JSON);
  game.load.image('tiles', 'assets/kenneyrpgpack/Spritesheet/RPGpack_sheet.png');
  game.load.bitmapFont('carrier_command', 'assets/fonts/carrier_command.png', 'assets/fonts/carrier_command.xml');

  game.load.image('barracks', 'assets/sprites/barracks1.png');
  game.load.image('barracks2', 'assets/sprites/barracks0.png');
  game.load.image('agency', 'assets/sprites/agency1.png');

  game.load.image('crate', 'assets/sprites/crate-icon.png');

  // Audio
  game.load.audio('music', 'assets/audio/epic-battle.mp3');
  game.load.audio('createFX', 'assets/audio/create.mp3');
}

// Audio
var music;
var audioFX = {};

var map;
var layer;

var marker;
var currentTile;
var cursors;

// Selected unit

var suppliesText;
var selected;

// Buildings
var buildings = [{
  name: 'Barracks',
  asset: 'barracks',
  description: 'This is a description for this building, lorem ipsum no se que mas y bla bla otras cosas.',
  cost: 10,
  limit: 1
}, {
  name: 'Engineering',
  asset: 'barracks2',
  description: 'This is a description for this building, lorem ipsum no se que mas y bla bla otras cosas.',
  cost: 100,
  limit: 1
}, {
  name: 'Agency',
  asset: 'agency',
  description: 'This is a description for this building, lorem ipsum no se que mas y bla bla otras cosas.',
  cost: 50,
  limit: 2
}];

function create() {
  game.stage.disableVisibilityChange = true;
  game.physics.startSystem(Phaser.Physics.ARCADE);

  map = game.add.tilemap('desert');
  map.addTilesetImage('Desert', 'tiles');
  currentTile = map.getTile(2, 3);
  layer = map.createLayer('Ground');
  var nature = map.createLayer('Nature');
  nature.resizeWorld();
  layer.resizeWorld();

  // Audio
  music = game.add.audio('music');
  game.sound.setDecodedCallback([music], function() {
    music.loopFull();
  }, this);

  audioFX.create = game.add.audio('createFX');

  marker = game.add.graphics();
  marker.lineStyle(2, 0x000000, 1);
  marker.drawRect(0, 0, 64, 64);
  marker.alpha = 0;
  cursors = game.input.keyboard.createCursorKeys();

  createInfoPanel();

  createMenu();

  // Center camera to island
  // game.add.tween(game.camera.position).to({ x: 200, y: 300 }, 500, Phaser.Easing.Linear.None, true);
  game.camera.setPosition(200, 300);

  game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
  game.scale.setShowAll();
  game.scale.refresh();
}

function createInfoPanel() {
  var infoPanel = game.add.group();
  infoPanel.fixedToCamera = true;
  infoPanel.cameraOffset.setTo(game.width - 260, 5);

  var panelBg = game.add.graphics();
  panelBg.beginFill(0x000000, 0.5);
  panelBg.drawRect(0, 0, 255, 40);
  panelBg.endFill();
  infoPanel.addChild(panelBg);

  var crate = infoPanel.create(0, 0, 'crate');
  crate.scale.x = 0.6;
  crate.scale.y = 0.6;
  crate.position.x = 8;
  crate.position.y = 3;

  suppliesText = game.add.bitmapText(60, 10, 'carrier_command','0', 18);
  panelBg.addChild(suppliesText);

  // Generate supplies
  window.supplies = 10000;
  var generateSupplies = function() {
    setTimeout(function() {
      supplies++;
      updateSupplies();
      generateSupplies();
    }, 1000);
  };
  generateSupplies();

  game.input.onDown.add(function() {
    console.log(layer.getTileX(game.input.activePointer.worldX) * 64);
    console.log(layer.getTileY(game.input.activePointer.worldY) * 64);
    if (selected && selected.canCreate) {
      addBuilding();
    }
  }, this);
}

function updateSupplies() {
  suppliesText.text = supplies.toLocaleString();
}

var buildingsMenuItems = [];
function createMenu() {
  var buildingsMenu = game.add.group();
  buildingsMenu.inputEnabled = true;
  buildingsMenu.fixedToCamera = true;
  buildingsMenu.cameraOffset.setTo(10, game.height - 75);

  var position = 0;
  buildings.forEach(function(_building) {
    var tooltip;
    var sprite = buildingsMenu.create(position, 0, _building.asset);

    sprite.scale.x = 0.5;
    sprite.scale.y = 0.5;
    sprite.alpha = 0.5;
    sprite.inputEnabled = true;
    sprite.input.useHandCursor = true;

    sprite.events.onInputOver.add(function() {
      tooltip.alpha = 1;
      sprite.alpha = 1;
    }, game);

    sprite.events.onInputOut.add(function() {
      tooltip.alpha = 0;
      sprite.alpha = 0.5;
    }, game);

    var createBuilding = function() {
      selected = {
        sprite: game.add.sprite(0, 0, _building.asset),
        data: _building
      };
      selected.sprite.inputEnabled = true;
    };

    if (!playerBuildings.length && _building.name === 'Barracks') {
      createBuilding();
      addBuilding({ x: 768, y: 640 });
    }

    sprite.events.onInputUp.add(function() {
      selected && selected.sprite.destroy();
      selected = null;

      var usedSlots = _.filter(playerBuildings, function(building) {
        return building.data.name === _building.name;
      });

      if (supplies >= _building.cost && usedSlots.length < _building.limit) {
        createBuilding();
      }
    }, game);

    // Tooltip
    tooltip = game.add.group();
    tooltip.alpha = 0;
    var tooltipBg = game.add.graphics();
    tooltipBg.beginFill(0x000000, 0.5);
    tooltipBg.drawRect(0, 0, 350, 200);
    tooltipBg.endFill();
    tooltip.addChild(tooltipBg);
    buildingsMenu.addChild(tooltip);
    tooltip.position.y = -220;
    tooltip.position.x = position;

    var name = game.add.bitmapText(10, 10, 'carrier_command', _building.name, 18);
    tooltip.addChild(name);

    var costTxt = game.add.bitmapText(10, 45, 'carrier_command', 'Cost: ', 16);
    tooltip.addChild(costTxt);

    var costValue = game.add.bitmapText(110, 45, 'carrier_command', _building.cost + '', 16);
    costValue.tint = 0xA9F335;
    tooltip.addChild(costValue);

    var style = { font: '12pt sans-serif', fill: 'white', align: 'left', wordWrap: true, wordWrapWidth: 320 };
    var description = game.add.text(10, 90, _building.description, style);
    tooltip.addChild(description);

    var style = { font: '12pt sans-serif', fill: 'white', align: 'left', wordWrap: true, wordWrapWidth: 320 };
    var available = game.add.text(10, 170, 'Units: 0 / 0', style);
    tooltip.addChild(available);

    sprite.update = function() {
      if (supplies < _building.cost) {
        costValue.tint = 0xFF4949;
      } else {
        costValue.tint = 0xA9F335;
      }

      var slotsUsed = _.filter(playerBuildings, function(building) {
        return building.data.name === _building.name;
      });

      available.text = 'Units: ' + slotsUsed.length + ' / ' + _building.limit;

      if (slotsUsed.length === _building.limit) {
        available.tint = 0xFF4949;
      } else {
        available.tint = 0xffffff;
      }
    };

    buildingsMenuItems.push(sprite);

    position += 96;
  });
}

function checkOverlap() {
  if (!selected || !selected.sprite._bounds) return;
  var intersects = false;

  playerBuildings.forEach(function(building) {
    if (selected) {
      var boundsA = building.sprite.getBounds();
      var boundsB = selected.sprite.getBounds();

      boundsA.x = boundsA.x + 10;
      boundsA.width = boundsA.width - 20;

      boundsA.y = boundsA.y + 10;
      boundsA.height = boundsA.height - 20;

      if (Phaser.Rectangle.intersects(boundsA, boundsB)) {
        intersects = true;
      }
    }
  });
  return intersects;
}

// document.querySelector('#scale-up').addEventListener('click', onScaleUp);
// document.querySelector('#scale-down').addEventListener('click', onScaleDown);

// function onScaleUp(e) {
//   var maxScale = 1.5;
//   if (game.world.scale.x >= maxScale) return;
//   scaleWorld(+0.5);
// }

// function onScaleDown(e) {
//   var minScale = 0.5;
//   if (game.world.scale.x <= minScale) return;
//   scaleWorld(-0.5);
// }

// function scaleWorld(value) {
//   var newScale = {
//     x: game.world.scale.x += value,
//     y: game.world.scale.y += value
//   };

//   game.add.tween(game.world.scale).to(newScale, 500, Phaser.Easing.Linear.None, true);
// }

function update() {
  marker.x = layer.getTileX(game.input.activePointer.worldX) * 64;
  marker.y = layer.getTileY(game.input.activePointer.worldY) * 64;

  if (game.input.keyboard.isDown(Phaser.Keyboard.ESC)) {
    selected && selected.sprite.destroy();
    selected = null;
  }

  if (cursors.left.isDown) {
      game.camera.x -= 7;
  } else if (cursors.right.isDown) {
      game.camera.x += 7;
  }

  if (cursors.up.isDown) {
      game.camera.y -= 7;
  } else if (cursors.down.isDown) {
      game.camera.y += 7;
  }

  if (selected) {
    selected.sprite.position.x = marker.x;
    selected.sprite.position.y = marker.y;

    var x = game.input.activePointer.worldX;
    var y = game.input.activePointer.worldY;
    var currentTile = getTileProperties(x, y);
    var currentTile2 = getTileProperties(x + (64 * 2), y);
    var currentTile3 = getTileProperties(x, y + 64);

    var cantCreate = currentTile.blocker ||
      currentTile2.blocker ||
      currentTile3.blocker ||
      currentTile.water ||
      currentTile2.water ||
      currentTile3.water;

    if (cantCreate || checkOverlap()) {
      selected.sprite.tint = 0xFF4949;
      selected.canCreate = false;
      selected.sprite.alpha = 0.3;
    } else {
      selected.sprite.alpha = 0.7;
      selected.canCreate = true;
      selected.sprite.tint = 0xFFFFFF;
      // 0x8CC334
    }
  }

  buildingsMenuItems.forEach(function(item) {
    item.update();
  });
}

var playerBuildings = [];
function addBuilding(position) {
  if (!selected) return;

  if (!position) {
    position = {
      x: marker.x,
      y: marker.y
    };
  }

  supplies -= selected.data.cost;
  audioFX.create.play();
  var newBuilding = game.add.sprite(position.x,position.y, selected.data.asset);
  newBuilding.inputEnabled = true;
  newBuilding.input.useHandCursor = true;

  playerBuildings.push({
    sprite: newBuilding,
    data: selected.data
  });

  // Destroy selected
  selected.sprite.destroy();
  selected = null;

  updateSupplies();

  // Add event listeners
  newBuilding.inputEnabled = true;
  newBuilding.events.onInputOver.add(function() {
    newBuilding.alpha = 0.8;
    // console.log('Hover!');
  }, game);

  newBuilding.events.onInputOut.add(function() {
    newBuilding.alpha = 1;
    // console.log('Out!');
  }, game);

}

function getTileProperties(_x, _y) {
  var x = layer.getTileX(_x);
  var y = layer.getTileY(_y);
  var tile = map.getTile(x, y, layer) || {};
  return tile.properties;
}

function render() {
}
