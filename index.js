var cors = require("cors");
const express = require("express");
const constants = require("./constants");

var app = express();
app.use(cors());

const axios = require("axios");
const port = process.env.PORT || 3001;

this.lastUpdate_players = {};

let CACHE = {
  teamsCache: { updated: -1, data: [] },
  playersCache: { },
}

const isCacheExpired = (cacheUpdatedTime) => {
  cacheDateDifference = parseInt((Date.now() - cacheUpdatedTime) / 1000);
  if (cacheDateDifference < 30) {
    return false;
  }
  return true;
}

const doesCacheExist = (id, cache) => {
  if (cache[id] == null || cache[id].updated == null){
    return false;
  }
  return true;
}

app.get("/getWeek", async (req, res) => {
  res.send({week: constants.week});
});

app.get("/getTeams", async (req, res) => {
  try {
    if (!isCacheExpired(CACHE.teamsCache.updated)) {
      console.log(`getTeams: CACHE RETURN`);
      res.status(200).send(CACHE.teamsCache.data);
      return;
    }

    console.log(`getTeams: NORMAL RETURN`);
    let url = `https://dfyql-ro.sports.yahoo.com/v2/contestEntries?lang=en-US&region=US&device=desktop&sort=rank&contestId=${constants.YAHOO_CONTEST_ID}&start=0&limit=30`;
    let response = await axios.get(url, {
      // headers: {
      //   "Access-Control-Allow-Origin": "*",
      //   "Access-Control-Allow-Headers":
      //     "Origin, X-Requested-With, Content-Type, Accept",
      //   Authorization:
      //     "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyNSwiaWF0IjoxNjIwMzUzNzgzLCJleHAiOjE2MjAzNjQ1ODMsInN1YiI6ImdhYiJ9.wd3FFje8CYxrCp00vELgGRRNBJNRWhKiKuDo5GWmcZo",
      // },
    });
    if (response.status !== 200) {
      throw `Status not 200. Status is ${response.status}`;
    }

    var players = [];
    response.data.entries.result.forEach((player) => {
      players.push({
        id: player.id,
        name: player.user.nickname,
        imageThumbUrl: player.user.imageThumbUrl,
        seriesId: player.seriesId,
        periodsRemaining: player.periodsRemaining,
        percentile: player.percentile,
        rank: player.rank,
        remainingTimeUnit: player.remainingTimeUnit,
        score: player.score,
      });
    });
    CACHE.teamsCache = { updated: Date.now(), data: players };
    res.status(200).send(players);
  } catch (err) {
    console.log(err);
    res.status(500).send({ err });
  }
});

app.get("/getLineupForTeam", async (req, res) => {
  try {
    if (doesCacheExist(req.query.id, CACHE.playersCache) && !isCacheExpired(CACHE.playersCache[req.query.id].updated)) {
      console.log(`GETLINEUPFORTEAM: ${req.query.id} CACHE RETURN`);
      res.status(200).send(CACHE.playersCache[req.query.id].data);
      return;
    }

    console.log(`GETLINEUPFORTEAM: ${req.query.id} NORMAL RETURN`);

    const url = `https://dfyql-ro.sports.yahoo.com/v2/contestEntry/${req.query.id}`;

    let response = await axios.get(url, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Origin, X-Requested-With, Content-Type, Accept",
      },
    });

    if (response.status !== 200) {
      throw `Status not 200. Status is ${response.status}`;
    }

    var players = [];
    response.data.entries.result[0].lineupSlotList.forEach((lineup) => {
      let projPts = lineup?.player?.projectedPoints ?? "";
      let pointsScored = lineup?.player?.points ?? "";
      let adjustedProj = projPts;
      let hadBigPlay = false;
      let bigPlayTimeRemaining = -1;

      if (lineup?.player?.game?.finished == false) {
        if (pointsScored != "" && this.lastUpdate_players[req.query.id] && this.lastUpdate_players[req.query.id].length > 0) {
          let lastUpdate_player = this.lastUpdate_players[req.query.id].find(
            (x) => x.id == lineup.player.playerSalaryId
          );
          if (lastUpdate_player != null) {
            let pointsDifference = pointsScored - lastUpdate_player.points;
            let timeFromLastBigPlay =
              lastUpdate_player.bigPlayTimeRemaining - lineup?.player?.game?.remainingTimeUnit;
            if (pointsDifference >= 4) {
              hadBigPlay = true;
              bigPlayTimeRemaining = lastUpdate_player.bigPlayTimeRemaining;
            } else if (timeFromLastBigPlay <= 3) {
              hadBigPlay = true;
              bigPlayTimeRemaining = lastUpdate_player.bigPlayTimeRemaining;
            }
          }
        }
      }

      if (projPts != "") {
        let gameRemainingTime = lineup?.player?.game?.remainingTimeUnit;
        let projPtsPerMin = projPts / 60;
        adjustedProj = projPtsPerMin * gameRemainingTime + pointsScored;
      }

      players.push({
        id: lineup?.player?.playerSalaryId ?? "",
        position: lineup.lineupSlot.key,
        firstName: lineup?.player?.firstName ?? "",
        lastName: lineup?.player?.lastName ?? "",
        salary: lineup?.player?.salary ?? "",
        primaryPosition: lineup?.player?.primaryPosition ?? "",
        projectedPoints: adjustedProj,
        points: lineup?.player?.points ?? "",
        draftPercent: lineup?.player?.playerDraftPercent ?? "",
        image: lineup?.player?.largeImageUrl ?? "",
        stats: lineup?.player?.stats,
        gameStatusType: lineup?.player?.game?.statusType,
        gameStatus: lineup?.player?.game?.status,
        hadBigPlay: hadBigPlay,
        bigPlayTime: bigPlayTimeRemaining,
      });
    });
    this.lastUpdate_players[req.query.id] = players;
    CACHE.playersCache[req.query.id] = { updated: Date.now(), data: players };

    res.status(200).send(players);
  } catch (err) {
    console.log(err);
    res.status(500).send({ err: err.message, stack: err.stack });
  }
});



app.listen(port, () => {
  console.log(`DFS Server listening on ${port}`);
});
