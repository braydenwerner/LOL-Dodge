import { useState, useEffect } from 'react'
import { BounceLoader, BarLoader, BeatLoader } from 'react-spinners'
import { GuardSpinner } from 'react-spinners-kit'
import styled from 'styled-components'

import { SummonerStats } from '../components/modules/index'
import { convertChampId, getAPIVersion } from '../util/convertChampId'
import { URL } from '../config/config'

export interface SummonerData {
  [id: string]: Summoner
}

export interface Summoner {
  accountId: string
  id: string
  name: string
  profileIconId: number
  puuid: string
  revisionDate: number
  summonerLevel: number
  freshBlood?: boolean
  hotStreak?: boolean
  inactive?: boolean
  leagueId?: string
  leaguePoints?: number
  losses?: number
  queueType?: string
  rank?: string
  tier?: string
  veteran?: boolean
  wins?: number
}

export interface MatchOverviewData {
  [id: string]: Match[]
}

export interface Match {
  champion: string
  gameId: number
  lane: string
  platformId: string
  queue: number
  role: string
  season: number
  timestamp: number
}

export interface MostCommonChampions {
  [id: string]: Champion
}

export interface Champion {
  [champion: string]: number
}

export interface MostCommonLanes {
  [id: string]: Lane
}

export interface Lane {
  [lane: string]: number
}

const ChampSelectPage: React.FC = () => {
  const [showInput, setShowInput] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [summonerNames, setSummonerNames] = useState<string[]>([])
  const [summonerData, setSummonerData] = useState<SummonerData>({})
  const [
    matchOverviewData,
    setMatchOverviewData,
  ] = useState<MatchOverviewData>({})
  const [
    mostCommonChampions,
    setMostCommonChampions,
  ] = useState<MostCommonChampions>({})
  const [
    mostCommonLanes,
    setMostCommonLanes,
  ] = useState<MostCommonLanes>({})

  useEffect(() => {
    getAPIVersion()
  }, [])

  useEffect(() => {
    const querySummonerData = async (summonerNames: string[]) => {
      setIsLoading(true)
      const res = await fetch(`${URL}/getSummonerData`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ summonerNames }),
      })
      const summonerObj = await res.json()
      if (summonerObj.error) {
        alert(summonerObj.error)
        return
      }

      console.log(summonerObj)
      setSummonerData(summonerObj)

      //  after the summoner data is collected, get match data for each
      queryMatchOverview(summonerObj)
    }

    const queryMatchOverview = async (summonerObj: SummonerData) => {
      const encryptedAccountIds = []
      for (const id in summonerObj) {
        encryptedAccountIds.push(summonerObj[id].accountId)
      }

      const res = await fetch(`${URL}/getSummonerMatchOverviews`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ encryptedAccountIds }),
      })
      const matchDataObj = await res.json()
      setMatchOverviewData(matchDataObj)
    }
    if (summonerNames.length === 5) querySummonerData(summonerNames)
  }, [summonerNames])

  //  if the match data exists for each player, calculate most common champs,
  //  most common roles,
  //  ex: mostCommonChampions[id] = {2: 9, 5: 4} -> champion of id 2, played 9 times
  useEffect(() => {
    const populateMatchData = async () => {
      console.log(matchOverviewData)
      const tempMostCommonLanes: MostCommonLanes = {}
      const tempMostCommonChamps: MostCommonChampions = {}

      for (const id in matchOverviewData) {
        const laneFreq: Lane = {}
        const champFreq: Champion = {}
        for (const matchObj in matchOverviewData[id]) {
          const lane = matchOverviewData[id][matchObj].lane
          const role = matchOverviewData[id][matchObj].role
          const champion: string = await convertChampId(
            matchOverviewData[id][matchObj].champion,
          )

          if (lane === 'BOTTOM') {
            if (role === 'DUO_SUPPORT') {
              if ('SUPPORT' in laneFreq) laneFreq['SUPPORT']++
              else laneFreq['SUPPORT'] = 1
            } else if (role === 'DUO_CARRY') {
              if ('ADC' in laneFreq) laneFreq['ADC']++
              else laneFreq['ADC'] = 1
            }
            continue
          }

          if (lane in laneFreq) laneFreq[lane]++
          else laneFreq[lane] = 1

          if (champion in champFreq) champFreq[champion]++
          else champFreq[champion] = 1
        }

        tempMostCommonLanes[id] = { ...laneFreq }
        tempMostCommonChamps[id] = { ...champFreq }
      }

      setMostCommonLanes(tempMostCommonLanes)
      setMostCommonChampions(tempMostCommonChamps)
      setIsLoading(false)
      setIsLoaded(true)
      setShowInput(false)
    }

    if (Object.keys(matchOverviewData).length > 0) populateMatchData()
  }, [matchOverviewData])

  const handleTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    if (!e.target.value) return

    const value = e.target.value
    const parsedSummonerNames = []
    const lines = value.split('\n')

    for (const line of lines) {
      let words = line.split(' ')
      let currentSummonerName = ''

      if (words.length > 3) {
        if (
          words[words.length - 1] === 'lobby' &&
          words[words.length - 2] === 'the' &&
          words[words.length - 3] === 'joined'
        ) {
          words = words.slice(0, words.length - 3)

          for (const word of words) {
            currentSummonerName += word + ' '
          }
        } else {
          alert('Invalid format')
          return
        }
        //  assume that the user just entered a username
      } else {
        for (const word of words) {
          currentSummonerName += word + ' '
        }
      }

      currentSummonerName.trimEnd()
      parsedSummonerNames.push(currentSummonerName)
    }

    if (parsedSummonerNames.length === 5) {
      e.target.value = ''
      setSummonerNames(parsedSummonerNames)
    }
  }

  return (
    <Wrapper>
      {isLoading && (
        <LoadingContainer>
          <GuardSpinner size={100} />
          <div>Retrieving Summoner Data</div>
          <BarLoader color={'red'} width='100%' />
        </LoadingContainer>
      )}
      {showInput && (
        <StyledTextField
          onChange={handleTextChange}
          placeholder={
            `xtremesoccer2012 joined the lobby
             \narotheawesome joined the lobby
             \nmineturtle20 joined the lobby
             \nlokimonsta joined the lobby
             \nplacerwiz joined the lobby`
          }
        />)
      }
      {isLoaded && (
        <SummonerStats
          summonerData={summonerData}
          mostCommonLanes={mostCommonLanes}
          mostCommonChampions={mostCommonChampions}
        />
      )}
    </Wrapper>
  )
}
export default ChampSelectPage

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh;
  text-align: center;
`

const StyledTextField = styled.textarea`
  position: relative;
  top: 25%;
  width: 600px;
  height: 135px;
  border: 5px solid ${(props) =>
    props.theme.inputBorder};
  background-color: ${(props) =>
    props.theme.inputBackground};
    resize: none;

  ::placeholder {
    color: #CAC4B4;
  }
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 500px;
  align-items: center;
`

