import { getParsedEthersError, RETURN_VALUE_ERROR_CODES } from '@enzoferey/ethers-error-parser';
import { EthersError } from '@enzoferey/ethers-error-parser/dist/types';
import { toast } from 'react-toastify';
import MultiStepsTransactionToast from '../components/MultiStepsTransactionToast';
import { graphIsSynced, graphUserIsSynced } from '../queries/global';
import { Client, Hash, Transaction, WalletClient } from 'viem';
import { PublicClient } from 'wagmi';

interface IMessages {
  pending: string;
  success: string;
  error: string;
}

export const createMultiStepsTransactionToast = async (
  chainId: number,
  messages: IMessages,
  publicClient: PublicClient,
  txHash: Hash,
  entity: string,
  newUri?: string,
): Promise<number | undefined> => {
  let currentStep = 1;
  const toastId = toast(
    <MultiStepsTransactionToast
      txHash={txHash}
      currentStep={currentStep}
      hasOffchainData={!!newUri}
    />,
    { autoClose: false, closeOnClick: false },
  );

  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ confirmations: 1, hash: txHash });
    currentStep = 2;
    toast.update(toastId, {
      render: (
        <MultiStepsTransactionToast
          txHash={txHash}
          currentStep={currentStep}
          hasOffchainData={!!newUri}
        />
      ),
    });

    if (newUri) {
      const entityId = await graphIsSynced(chainId, `${entity}s`, newUri);
      currentStep = 3;
      toast.update(toastId, {
        render: <MultiStepsTransactionToast txHash={txHash} currentStep={currentStep} />,
      });

      await graphIsSynced(chainId, `${entity}Descriptions`, newUri);
      toast.update(toastId, {
        type: toast.TYPE.SUCCESS,
        render: messages.success,
        autoClose: 5000,
        closeOnClick: true,
      });

      return entityId;
    }

    toast.update(toastId, {
      type: toast.TYPE.SUCCESS,
      render: messages.success,
      autoClose: 5000,
      closeOnClick: true,
    });

    return;
  } catch (error) {
    const errorMessage = getParsedErrorMessage(error);
    console.error(error);
    toast.update(toastId, {
      type: toast.TYPE.ERROR,
      render: errorMessage,
    });
  }
  return;
};

export const showErrorTransactionToast = (error: any) => {
  console.error(error);
  let errorMessage = getParsedErrorMessage(error);
  if (error.response && error.response.status === 500) {
    errorMessage = error.response.data;
  }
  toast.error(errorMessage);
};

export const createTalentLayerIdTransactionToast = async (
  chainId: number,
  messages: IMessages,
  publicClient: PublicClient,
  txHash: Hash,
  address: string,
): Promise<number | undefined> => {
  let currentStep = 1;
  const toastId = toast(
    <MultiStepsTransactionToast
      txHash={txHash}
      currentStep={currentStep}
      hasOffchainData={false}
    />,
    { autoClose: false, closeOnClick: false },
  );

  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    currentStep = 2;
    toast.update(toastId, {
      render: (
        <MultiStepsTransactionToast
          txHash={txHash}
          currentStep={currentStep}
          hasOffchainData={false}
        />
      ),
    });

    const entityId = await graphUserIsSynced(chainId, address);

    toast.update(toastId, {
      type: toast.TYPE.SUCCESS,
      render: messages.success,
      autoClose: 5000,
      closeOnClick: true,
    });

    return entityId;
  } catch (error) {
    const errorMessage = getParsedErrorMessage(error);
    console.error(error);
    toast.update(toastId, {
      type: toast.TYPE.ERROR,
      render: errorMessage,
    });
  }
  return;
};

function getParsedErrorMessage(error: any) {
  const parsedEthersError = getParsedEthersError(error as EthersError);
  if (parsedEthersError.errorCode === RETURN_VALUE_ERROR_CODES.REJECTED_TRANSACTION) {
    return `${parsedEthersError.errorCode} - user rejected transaction`;
  } else {
    return `${parsedEthersError.errorCode} - ${parsedEthersError.context}`;
  }
}
