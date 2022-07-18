import * as React from "react";
import {useEffect, useState} from "react";
import {Alert, Box, Button, Chip, Collapse, FormControl, Grid, IconButton, InputLabel, MenuItem, Select, TextareaAutosize, Typography} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import {useVotingContract} from "../contexts/UseVotingContract";
import {useAccount, useContractEvent, useContractWrite} from "wagmi";
import {useStyles} from "./Voting";
import {BigNumber} from "ethers";

function Voter({voteur, workflowStatus, labelWorkflowStatus, winningId}) {

    const chipCustomClass = useStyles();
    /*
        const [voter, setVoter] = useState(voteur)
    */
    const [proposal, setProposal] = useState('')
    const [voter, setVoter] = useState(voteur)
    const [openDialogOk, setOpenDialogOk] = useState(false)
    const [proposalList, setProposalList] = useState([])
    const [proposalSelected, setProposalSelected] = useState('')
    const {contractConfig, contractProvider, contractSigner} = useVotingContract()
    const {address} = useAccount()

    const addProposal = useContractWrite({
        ...contractConfig,
        functionName: 'addProposal',
        onError(error) {
            console.log("Error add proposal", error);
        },
        onSuccess(data) {
            setOpenDialogOk(true)
            setProposal('')
            console.log("Success addProposal", data);
        }
    })

    const voteProposal = useContractWrite({
        ...contractConfig,
        functionName: 'setVote',
        onError(error) {
            console.log("Error vote proposal", error);
        },
        onSuccess(data) {
            setProposalSelected('')
            console.log("Success voteProposal", data);
        }
    })

    // Permet d'écouter un event d'enregistrement d'un voter pour mettre à jour le tableau
    useContractEvent({
        ...contractConfig,
        eventName: 'Voted',
        listener: (event) => {
            // 👇️ push to end of state array
            contractSigner.getVoter(address).then((voter) => {
                console.log("update voter")
                setVoter(voter);
            }).catch(function (e) {
                console.warn("Vous ne pouvez pas voter - ", e);
            })
        },
    })

    // Rendu initial du composant
    useEffect(
        () => {
            async function getProposals() {
                try {

                    // on récupère tous les id de propositions enregistrées via l'event ProposalRegistered
                    let eventFilter = contractProvider.filters.ProposalRegistered()
                    let eventsProposalRegistered = await contractProvider.queryFilter(eventFilter)
                    eventsProposalRegistered.map(async ({args}) => {
                        const id = args[0].toNumber();
                        const proposal = await contractSigner.getOneProposal(id)
                        setProposalList(current => [...current, {id: id, description: proposal.description}]);
                    })

                } catch (error) {
                    alert(`Failed to load web3, accounts, or contract. Check console for details.`,);
                    console.error(error);
                }
            }

            setOpenDialogOk(false)
            getProposals();

        },
        [address]
    );

    /*    useEffect(
            () => {
                if (proposalSelected === '') {
                    console.log("Refesh data voter")
                    contractSigner.getVoter(address).then((voter) => {
                        setVoter(voter)
                    }).catch(function (e) {
                        setVoter(null)
                        console.warn("Vous ne pouvez pas voter - ", e);
                    })
                }
            },
            [proposalSelected]
        );*/

    const addProposals = () => {

        if (proposal) {
            console.log("Ajout proposition : " + proposal);
            addProposal.write({
                args: proposal
            })
        }

    };

    const handleChangePropal = (event) => {
        setProposalSelected(event.target.value);
    };


    const voterPourUneProposition = () => {

        //TODO comprendre ce param bug à 0
        if (proposalSelected != '' || proposalSelected === 0) {
            console.log("Vote pour : " + proposalSelected);
            voteProposal.write({
                args: proposalSelected === 0 ? BigNumber.from(proposalSelected) : proposalSelected
            })
        } else {
            alert("Vous devez voter pour une proposition !")
        }

    };

    return (
        <React.Fragment>
            <Box sx={{width: '100%'}}>
                <Collapse in={openDialogOk}>
                    <Alert
                        action={
                            <IconButton
                                aria-label="close"
                                color="inherit"
                                size="small"
                                onClick={() => {
                                    setOpenDialogOk(false);
                                }}
                            >
                                <CloseIcon fontSize="inherit"/>
                            </IconButton>
                        }
                        sx={{mb: 2}}
                    >
                        Votre proposition a été prise en compte !
                    </Alert>
                </Collapse>
            </Box>
            <Grid container spacing={5}>
                <Grid item xs={12}>
                    <Typography variant="h5" gutterBottom>
                        Vous êtes un <strong>électeur</strong>. La session est à <Chip className={chipCustomClass.chipCustom} size="medium" color={"primary"}
                                                                                       label={labelWorkflowStatus}/>
                    </Typography>
                    <Typography variant="h6" gutterBottom hidden={workflowStatus > 0}>
                        Veuillez attendre l'enregistrement des propositions.
                    </Typography>
                    <Typography variant="h6" gutterBottom hidden={workflowStatus !== 2}>
                        Veuillez attendre l'ouverture du vote.
                    </Typography>
                    <Typography variant="h6" gutterBottom hidden={workflowStatus !== 4}>
                        Veuillez attendre le dépouillement
                    </Typography>
                </Grid>
                {workflowStatus === 1 && <>
                    <Grid item xs={12} sm={6}>
                        <TextareaAutosize
                            required
                            id="proposal"
                            name="proposal"
                            minRows={3}
                            label="Saisir une proposition"
                            style={{width: 400}}
                            variant="standard"
                            value={proposal}
                            onChange={(event) => {
                                setProposal(event.target.value)
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Button variant="contained" onClick={addProposals}>Ajouter</Button>
                    </Grid>
                </>}
                {workflowStatus === 3 && proposalList.length > 0 && !voter?.hasVoted && <>
                    <Grid item xs={12} sm={6}>
                        <FormControl sx={{m: 1, width: 400}}>
                            <InputLabel id="proposalSelect">Sélectionner votre proposition préférée</InputLabel>
                            <Select
                                labelId="proposalSelect"
                                id="proposalSelect"
                                onChange={handleChangePropal}
                                value={proposalSelected}
                            >
                                {proposalList.map((proposal) => (
                                    <MenuItem
                                        key={proposal.id}
                                        value={proposal.id}>
                                        {proposal.id + "-" + proposal.description}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Button variant="contained" onClick={voterPourUneProposition}>Voter</Button>
                    </Grid>
                </>}
                {voter?.hasVoted && proposalList.length > 0 && <>
                    <Grid item xs={12}>
                        <Typography variant="h5" gutterBottom>
                            Vous avez déjà voté pour la proposition : <Chip className={chipCustomClass.chipCustom}
                                                                            label={proposalList.find(prop => prop.id === voter?.votedProposalId.toNumber())?.description}
                                                                            variant="outlined"/>

                        </Typography>
                    </Grid></>}
                <Grid item xs={12} hidden={workflowStatus !== 5}>
                    Le vote est clos et la proposition gagnante est la <Chip className={chipCustomClass.chipCustom}
                                                                             label={winningId + " - " + proposalList.find(prop => prop.id === winningId)?.description}
                                                                             variant="outlined"/>
                </Grid>
            </Grid>
        </React.Fragment>
    )
}

export default Voter;
