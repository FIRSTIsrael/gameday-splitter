const videoID = '519963856';
const eventKey = '1920-ISR-SIS';
const fileName = '519963856.mp4';
const TOA_KEY = '';
const TWITCH_KEY = 'k7l2k845upq0u7a96a3a10qoaqc5ka';
const muteAudio = false;
const offset = 0;

///////////////////////////////////////////////////////////////////////////////////
const exec = require('child_process').exec;
const fetch = require('node-fetch');

(async () => {
  const video = (await httpGet('https://api.twitch.tv/helix/videos?id=' + videoID)).data[0];
  const duration = formatDuration(video.duration) * 1000;
  const unixStart = new Date(video.created_at).getTime();
  const unixEnd = unixStart + duration;

  const event = (await httpGet('https://theorangealliance.org/api/event/' + eventKey))[0];
  const matches = await httpGet(`https://theorangealliance.org/api/event/${eventKey}/matches`);
  const eventName = `${event.event_name} 2019-20`;

  matches.forEach((match) => {
    if (match.match_start_time) {
      const startTime = new Date(match.match_start_time).getTime() + offset * 1000;
      const endTime = startTime + 160 * 1000;
      const videoName = `${match.match_name} - ${eventName}`;

      if (unixEnd > endTime && unixStart < startTime) {
        let start = new Date(null);
        let end = new Date(null);
        start.setMilliseconds(startTime - unixStart);
        end.setMilliseconds(endTime - unixStart);

        let ffmpegPath = '';
        const os = process.platform;
        if (os === 'darwin') {
          ffmpegPath = './ffmpeg/ffmpeg'; // macOS
        } else if (os === 'win32') {
          ffmpegPath = './ffmpeg/ffmpeg.exe'; // Windows
        } else {
          error('Unknown OS');
        }

        console.log(`✂️ Cutting ${match.match_name}`);
        const command = `${ffmpegPath} -ss ${start.toISOString().substr(11, 8)} -to ${end
          .toISOString()
          .substr(11, 8)} -i ${fileName} -y -c copy ${muteAudio ? '-an' : ''} "${videoName}.mp4"`;
        execute(command, (error, result) => {
          if (error) console.log(error);
          if (result) console.log(result);
        });
      }
    }
  });

  console.log('\n');
  matches.forEach((match) => {
    const red = match.participants.filter((p) => p.station < 20).map((p) => p.team_key);
    const blue = match.participants.filter((p) => p.station > 20).map((p) => p.team_key);
    const description = `${match.match_name} - ${event.event_name}
Red (Teams ${red.join(', ')}) - ${match.red_score}
Blue (Teams ${blue.join(', ')}) - ${match.blue_score}
Full breakdown: https://theorangealliance.org/matches/${match.match_key}`;
    console.log('\n\n' + description);
  });

  function execute(command, callback) {
    exec(command, (error, stdout) => {
      callback(error, stdout);
    });
  }

  function error(error) {
    console.log('\033[31mError: ' + error);
    process.exit(0);
  }

  function httpGet(url) {
    return fetch(url, {
      headers: {
        'Client-ID': url.includes('twitch.tv') && TWITCH_KEY,
        'Content-Type': url.includes('theorangealliance') && 'application/json',
        'X-Application-Origin': url.includes('theorangealliance') && 'FIRST Israel Gameday Splitter',
        'X-TOA-Key': url.includes('theorangealliance') && TOA_KEY
      }
    }).then((res) => res.json());
  }

  function formatDuration(duration) {
    let a = duration.match(/\d+/g);
    if (duration.includes('H') && duration.includes('M')) {
      a = [a[0], a[1], 0];
    } else if (duration.includes('H') && duration.includes('S') && a.length === 2) {
      a = [a[0], 0, a[1]];
    } else if (duration.includes('H') && a.length === 1) {
      a = [a[0], 0, 0];
    } else if (duration.includes('M') && a.length === 1) {
      a = [a[0], 0];
    }

    if (a.length === 3) {
      return parseInt(a[0]) * 3600 + parseInt(a[1]) * 60 + parseInt(a[2]);
    } else if (a.length === 2) {
      return parseInt(a[0]) * 60 + parseInt(a[1]);
    } else if (a.length === 1) {
      return parseInt(a[0]);
    }
    return 0;
  }
})();
