var cors = require("cors");
const express = require("express");
const constants = require("./constants");

var app = express();
app.use(cors());

const axios = require("axios");
const port = process.env.PORT || 3001;

app.get("/getTeams", async (req, res) => {
  try {
    let url = `https://dfyql-ro.sports.yahoo.com/v2/contestEntries?lang=en-US&region=US&device=desktop&sort=rank&contestId=${constants.YAHOO_CONTEST_ID}&start=0&limit=20`
    let response = await axios.get(url
      ,
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "Origin, X-Requested-With, Content-Type, Accept",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyNSwiaWF0IjoxNjIwMzUzNzgzLCJleHAiOjE2MjAzNjQ1ODMsInN1YiI6ImdhYiJ9.wd3FFje8CYxrCp00vELgGRRNBJNRWhKiKuDo5GWmcZo",
        },
      }
    );
    if (response.status !== 200) {
      throw `Status not 200. Status is ${response.status}`;
    }

    var players = [];
    response.data.entries.result.forEach(player => {
        players.push({
            id: player.id,
            name: player.user.nickname,
            imageThumbUrl: player.user.imageThumbUrl,
            seriesId: player.seriesId,
            periodsRemaining: player.periodsRemaining,
            percentile: player.percentile,
            rank: player.rank,
            remainingTimeUnit: player.remainingTimeUnit,
            score: player.score
        })
    });;
    res.status(200).send(players);
  } catch (err) {
    res.status(500).send({ err });
  }
});

app.get("/getLineupForTeam", async (req, res) => {
    try {
      const url = `https://dfyql-ro.sports.yahoo.com/v2/contestEntry/${req.query.id}`;

      let response = await axios.get(url
        ,
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":
              "Origin, X-Requested-With, Content-Type, Accept"          },
        }
      );
      if (response.status !== 200) {
        throw `Status not 200. Status is ${response.status}`;
      }
  
      var players = [];
      response.data.entries.result[0].lineupSlotList.forEach(lineup => {
          players.push({
            position: lineup.lineupSlot.key,
            firstName: lineup?.player?.firstName ?? "",
            lastName: lineup?.player?.lastName ?? "",
            salary: lineup?.player?.salary ?? "",
            primaryPosition: lineup?.player?.primaryPosition ?? "",
            projectedPoints: lineup?.player?.projectedPoints ?? "",
            points: lineup?.player?.points ?? "",
            draftPercent: lineup?.player?.playerDraftPercent ?? "",
            image: lineup?.player?.largeImageUrl ?? "",
            stats: lineup?.player?.stats
          });
      });;
      res.status(200).send(players);
    } catch (err) {
      res.status(500).send({err: err.message, stack: err.stack });
    }
  });

app.listen(port, () => {
  console.log(`DFS Server listening on ${port}`);
});
